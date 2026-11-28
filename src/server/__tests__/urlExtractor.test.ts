import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractUrlOnServer,
  isPrivateOrReservedIp,
  validatePublicHttpUrl,
} from '../urlExtractor.ts';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

test('isPrivateOrReservedIp blocks loopback, RFC1918, metadata, and private IPv6 addresses', () => {
  const blocked = [
    '127.0.0.1',
    '127.255.255.254',
    '0.0.0.0',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.10',
    '169.254.169.254',
    '100.64.0.1',
    '::1',
    '::',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
  ];
  for (const ip of blocked) {
    assert.equal(isPrivateOrReservedIp(ip), true, `Expected ${ip} to be blocked`);
  }

  const allowed = ['93.184.216.34', '1.1.1.1', '8.8.8.8', '2606:2800:220:1:248:1893:25c8:1946'];
  for (const ip of allowed) {
    assert.equal(isPrivateOrReservedIp(ip), false, `Expected ${ip} to be allowed`);
  }
});

test('validatePublicHttpUrl blocks non-http schemes, credentials, localhost, metadata, and private DNS resolutions', async () => {
  const blockedUrls = [
    'file:///etc/passwd',
    'ftp://example.com/file.txt',
    'javascript:alert(1)',
    'https://user:pass@example.com/private',
    'http://localhost:3000/api/health',
    'http://sub.localhost/secret',
    'http://127.0.0.1:8080/admin',
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://[::1]:3000/',
    'http://10.0.0.5/internal',
    'http://192.168.0.1/',
  ];

  for (const url of blockedUrls) {
    const result = await validatePublicHttpUrl(url, publicLookup);
    assert.equal(result.valid, false, `Expected ${url} to be blocked`);
  }

  // DNS rebinding / internal DNS answer blocked
  const privateDns = await validatePublicHttpUrl('https://internal.example.com/doc', async () => [
    { address: '10.20.30.40', family: 4 },
  ]);
  assert.equal(privateDns.valid, false);

  // Public URL passes
  const ok = await validatePublicHttpUrl('https://example.com/article', publicLookup);
  assert.equal(ok.valid, true);
  assert.equal(ok.normalizedUrl, 'https://example.com/article');
});

test('extractUrlOnServer NEVER silently falls back to r.jina.ai when direct fetch fails', async () => {
  const requestedUrls: string[] = [];
  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    return new Response('Forbidden', { status: 403 });
  };

  const result = await extractUrlOnServer(
    { url: 'https://example.com/protected' },
    { fetchImpl: fakeFetch, lookupAll: publicLookup }
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 422);
  assert.equal(result.code, 'DIRECT_FETCH_FAILED');
  assert.deepEqual(requestedUrls, ['https://example.com/protected']);
  assert.equal(
    requestedUrls.some((u) => u.includes('r.jina.ai')),
    false,
    'Must never silently send URL to r.jina.ai'
  );
});

test('extractUrlOnServer contacts r.jina.ai ONLY when explicitly approved and still blocks private URLs', async () => {
  const requestedUrls: string[] = [];
  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    return new Response(
      '# Extracted Article\n\nThis article content was extracted with explicit user approval via Jina Reader.',
      { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  };

  // Private URL must STILL be blocked even if thirdPartyProxy is set
  const blocked = await extractUrlOnServer(
    { url: 'http://169.254.169.254/latest/meta-data/', thirdPartyProxy: 'jina' },
    { fetchImpl: fakeFetch, lookupAll: publicLookup }
  );
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, 'BLOCKED_URL');
  assert.equal(requestedUrls.length, 0);

  // Explicit opt-in for public URL contacts r.jina.ai
  const approved = await extractUrlOnServer(
    { url: 'https://example.com/article', thirdPartyProxy: 'jina' },
    { fetchImpl: fakeFetch, lookupAll: publicLookup }
  );
  assert.equal(approved.ok, true);
  assert.equal(approved.source, 'jina');
  assert.ok(approved.markdown?.includes('Extracted Article'));
  assert.deepEqual(requestedUrls, ['https://r.jina.ai/https://example.com/article']);
});

test('extractUrlOnServer blocks redirects to private or metadata addresses', async () => {
  const requestedUrls: string[] = [];
  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    return new Response(null, {
      status: 302,
      headers: { location: 'http://169.254.169.254/latest/meta-data/' },
    });
  };

  const result = await extractUrlOnServer(
    { url: 'https://example.com/redirect' },
    { fetchImpl: fakeFetch, lookupAll: publicLookup }
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.code, 'BLOCKED_URL');
  assert.deepEqual(requestedUrls, ['https://example.com/redirect']);
});

test('extractUrlOnServer rejects oversized responses and non-text binary content', async () => {
  const oversized = await extractUrlOnServer(
    { url: 'https://example.com/huge' },
    {
      lookupAll: publicLookup,
      maxResponseBytes: 64,
      fetchImpl: async () =>
        new Response('x'.repeat(200), {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
    }
  );
  assert.equal(oversized.ok, false);
  assert.equal(oversized.status, 413);
  assert.equal(oversized.code, 'RESPONSE_TOO_LARGE');

  const binary = await extractUrlOnServer(
    { url: 'https://example.com/video.mp4' },
    {
      lookupAll: publicLookup,
      fetchImpl: async () =>
        new Response('binary', {
          status: 200,
          headers: { 'content-type': 'video/mp4' },
        }),
    }
  );
  assert.equal(binary.ok, false);
  assert.equal(binary.status, 415);
  assert.equal(binary.code, 'UNSUPPORTED_CONTENT');
});
