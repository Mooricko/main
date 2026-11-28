import dns from 'node:dns/promises';
import net from 'node:net';

export const MAX_REDIRECTS = 5;
export const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
export const DEFAULT_DIRECT_TIMEOUT_MS = 9000;
export const DEFAULT_JINA_TIMEOUT_MS = 8000;

export type ServerThirdPartyProxy = 'jina';

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
}

export interface ServerUrlExtractRequest {
  url: string;
  thirdPartyProxy?: ServerThirdPartyProxy;
}

export interface ServerUrlExtractResponse {
  ok: boolean;
  status: number;
  code?: 'MISSING_URL' | 'BLOCKED_URL' | 'UNSUPPORTED_CONTENT' | 'RESPONSE_TOO_LARGE' | 'DIRECT_FETCH_FAILED' | 'PROXY_FETCH_FAILED';
  html?: string;
  markdown?: string;
  url?: string;
  contentType?: string;
  source?: 'backend-direct' | 'jina';
  statusCode?: number;
  error?: string;
}

export interface ServerUrlExtractDeps {
  fetchImpl?: typeof fetch;
  lookupAll?: (hostname: string) => Promise<Array<{ address: string; family: number }>>;
  directTimeoutMs?: number;
  jinaTimeoutMs?: number;
  maxResponseBytes?: number;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
  'instance-data',
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const num = Number(part);
    if (num < 0 || num > 255) return null;
    value = ((value << 8) | num) >>> 0;
  }
  return value;
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true;

  const first = (n >>> 24) & 0xff;
  const second = (n >>> 16) & 0xff;
  const third = (n >>> 8) & 0xff;

  if (first === 0) return true; // 0.0.0.0/8 ("this network")
  if (first === 10) return true; // 10.0.0.0/8 (RFC1918)
  if (first === 100 && second >= 64 && second <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (first === 127) return true; // 127.0.0.0/8 (loopback)
  if (first === 169 && second === 254) return true; // 169.254.0.0/16 (link-local & cloud metadata)
  if (first === 172 && second >= 16 && second <= 31) return true; // 172.16.0.0/12 (RFC1918)
  if (first === 192 && second === 0 && third === 0) return true; // 192.0.0.0/24 (IETF protocol assignments)
  if (first === 192 && second === 0 && third === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
  if (first === 192 && second === 168) return true; // 192.168.0.0/16 (RFC1918)
  if (first === 198 && (second === 18 || second === 19)) return true; // 198.18.0.0/15 (benchmarking)
  if (first === 198 && second === 51 && third === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
  if (first === 203 && second === 0 && third === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
  if (first >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved/broadcast

  return false;
}

function expandIpv6ToWords(ip: string): number[] | null {
  const withoutZone = ip.split('%')[0].toLowerCase();
  if (!withoutZone) return null;

  // Handle IPv4-embedded suffix (e.g., ::ffff:127.0.0.1)
  let normalized = withoutZone;
  const lastColon = normalized.lastIndexOf(':');
  if (lastColon !== -1 && normalized.slice(lastColon + 1).includes('.')) {
    const v4Part = normalized.slice(lastColon + 1);
    const v4Int = ipv4ToInt(v4Part);
    if (v4Int === null) return null;
    const hi = ((v4Int >>> 16) & 0xffff).toString(16);
    const lo = (v4Int & 0xffff).toString(16);
    normalized = `${normalized.slice(0, lastColon)}:${hi}:${lo}`;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) return null;

  const parseGroups = (part: string): number[] | null => {
    if (!part) return [];
    const groups = part.split(':');
    const out: number[] = [];
    for (const g of groups) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };

  const left = parseGroups(halves[0]);
  const right = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (!left || !right) return null;

  if (halves.length === 1) {
    return left.length === 8 ? left : null;
  }

  const missing = 8 - (left.length + right.length);
  if (missing < 1) return null;
  return [...left, ...new Array<number>(missing).fill(0), ...right];
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const words = expandIpv6ToWords(ip);
  if (!words || words.length !== 8) return true;

  const isAllZero = words.every((w) => w === 0);
  if (isAllZero) return true; // :: unspecified

  const isLoopback = words.slice(0, 7).every((w) => w === 0) && words[7] === 1;
  if (isLoopback) return true; // ::1 loopback

  // IPv4-mapped ::ffff:0:0/96 or IPv4-compatible ::/96
  const isV4Mapped =
    words.slice(0, 5).every((w) => w === 0) && words[5] === 0xffff;
  const isV4Compatible =
    words.slice(0, 6).every((w) => w === 0) && (words[6] !== 0 || words[7] > 1);
  if (isV4Mapped || isV4Compatible) {
    const embeddedIp = `${(words[6] >>> 8) & 0xff}.${words[6] & 0xff}.${(words[7] >>> 8) & 0xff}.${words[7] & 0xff}`;
    return isPrivateOrReservedIpv4(embeddedIp);
  }

  // NAT64 well-known prefix 64:ff9b::/96 -> check embedded IPv4
  if (
    words[0] === 0x0064 &&
    words[1] === 0xff9b &&
    words[2] === 0 &&
    words[3] === 0 &&
    words[4] === 0 &&
    words[5] === 0
  ) {
    const embeddedIp = `${(words[6] >>> 8) & 0xff}.${words[6] & 0xff}.${(words[7] >>> 8) & 0xff}.${words[7] & 0xff}`;
    return isPrivateOrReservedIpv4(embeddedIp);
  }

  const first = words[0];
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 Unique Local Address
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 Link-Local
  if ((first & 0xffc0) === 0xfec0) return true; // fec0::/10 Deprecated Site-Local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 Multicast
  if (first === 0x0100 && words[1] === 0 && words[2] === 0 && words[3] === 0) return true; // 100::/64 discard
  if (first === 0x2001 && words[1] === 0x0db8) return true; // 2001:db8::/32 documentation

  return false;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const cleaned = ip.trim().replace(/^\[|\]$/g, '');
  const version = net.isIP(cleaned);
  if (version === 4) return isPrivateOrReservedIpv4(cleaned);
  if (version === 6) return isPrivateOrReservedIpv6(cleaned);
  return true;
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/\.$/, '');
  if (!lower) return true;
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  if (
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.arpa')
  ) {
    return true;
  }
  return false;
}

/**
 * Validates that a user-supplied URL is a safe, public http(s) URL
 * and does not target loopback, private, or cloud metadata networks.
 */
export async function validatePublicHttpUrl(
  rawInput: string,
  lookupAll?: (hostname: string) => Promise<Array<{ address: string; family: number }>>
): Promise<UrlValidationResult> {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Missing "url" parameter.' };
  }

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http:// and https:// URLs are supported.' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with embedded credentials are not allowed.' };
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (isBlockedHostname(hostname)) {
    return { valid: false, error: 'Local and internal network addresses cannot be fetched.' };
  }

  if (net.isIP(hostname) !== 0) {
    if (isPrivateOrReservedIp(hostname)) {
      return { valid: false, error: 'Private, loopback, or reserved IP addresses cannot be fetched.' };
    }
    return { valid: true, normalizedUrl: parsed.toString() };
  }

  const resolver =
    lookupAll ??
    (async (host: string) => {
      const results = await dns.lookup(host, { all: true, verbatim: true });
      return results.map((entry) => ({ address: entry.address, family: entry.family }));
    });

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await resolver(hostname);
  } catch {
    return { valid: false, error: `Could not resolve hostname "${hostname}".` };
  }

  if (!addresses || addresses.length === 0) {
    return { valid: false, error: `Hostname "${hostname}" did not resolve to any address.` };
  }

  for (const entry of addresses) {
    if (isPrivateOrReservedIp(entry.address)) {
      return {
        valid: false,
        error: 'This URL resolves to a private or internal network address and cannot be fetched.',
      };
    }
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

function isReadableTextContentType(contentType: string): boolean {
  if (!contentType) return true;
  const mime = contentType.split(';')[0].trim().toLowerCase();
  if (!mime) return true;
  return (
    mime.startsWith('text/') ||
    mime === 'application/xhtml+xml' ||
    mime === 'application/xml' ||
    mime === 'application/json' ||
    mime === 'application/rss+xml' ||
    mime === 'application/atom+xml'
  );
}

async function readResponseTextBounded(
  response: Response,
  maxBytes: number
): Promise<{ text: string; tooLarge: boolean }> {
  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader) {
    const parsedLength = Number(contentLengthHeader);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      try {
        await response.body?.cancel();
      } catch {
        // Ignore cancel errors
      }
      return { text: '', tooLarge: true };
    }
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      return { text: '', tooLarge: true };
    }
    return { text, tooLarge: false };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          return { text: '', tooLarge: true };
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const merged = Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength)));
  return { text: merged.toString('utf8'), tooLarge: false };
}

/**
 * Fetches a public web page on the backend.
 *
 * - Default mode performs ONLY a direct fetch (with manual redirect validation).
 * - NEVER silently forwards URLs to third-party proxies like r.jina.ai.
 * - Contacts r.jina.ai ONLY when `thirdPartyProxy: 'jina'` is explicitly requested
 *   after user consent, and still validates that the URL is a safe public http(s) URL.
 */
export async function extractUrlOnServer(
  request: ServerUrlExtractRequest,
  deps: ServerUrlExtractDeps = {}
): Promise<ServerUrlExtractResponse> {
  if (!request.url || !request.url.trim()) {
    return {
      ok: false,
      status: 400,
      code: 'MISSING_URL',
      error: 'Missing "url" parameter.',
    };
  }

  const validation = await validatePublicHttpUrl(request.url, deps.lookupAll);
  if (!validation.valid || !validation.normalizedUrl) {
    return {
      ok: false,
      status: 400,
      code: 'BLOCKED_URL',
      error: validation.error || 'URL is not allowed.',
    };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const maxBytes = deps.maxResponseBytes ?? MAX_RESPONSE_BYTES;

  // Explicit opt-in third-party proxy mode (r.jina.ai)
  if (request.thirdPartyProxy === 'jina') {
    const jinaController = new AbortController();
    const jinaTimeout = setTimeout(
      () => jinaController.abort(),
      deps.jinaTimeoutMs ?? DEFAULT_JINA_TIMEOUT_MS
    );

    try {
      const jinaRes = await fetchImpl(`https://r.jina.ai/${validation.normalizedUrl}`, {
        signal: jinaController.signal,
        headers: {
          Accept: 'text/plain',
          'User-Agent': 'KhoroosReader/1.0',
        },
      });

      if (!jinaRes.ok) {
        return {
          ok: false,
          status: 422,
          code: 'PROXY_FETCH_FAILED',
          statusCode: jinaRes.status,
          url: validation.normalizedUrl,
          error: `r.jina.ai could not extract this page (HTTP ${jinaRes.status}).`,
        };
      }

      const { text: markdown, tooLarge } = await readResponseTextBounded(jinaRes, maxBytes);
      if (tooLarge) {
        return {
          ok: false,
          status: 413,
          code: 'RESPONSE_TOO_LARGE',
          url: validation.normalizedUrl,
          error: 'The page response is too large to import.',
        };
      }

      if (!markdown || markdown.trim().length < 50) {
        return {
          ok: false,
          status: 422,
          code: 'PROXY_FETCH_FAILED',
          url: validation.normalizedUrl,
          error: 'r.jina.ai returned too little readable text for this page.',
        };
      }

      return {
        ok: true,
        status: 200,
        markdown,
        url: validation.normalizedUrl,
        source: 'jina',
      };
    } catch {
      return {
        ok: false,
        status: 422,
        code: 'PROXY_FETCH_FAILED',
        url: validation.normalizedUrl,
        error: 'Could not reach r.jina.ai to extract this page.',
      };
    } finally {
      clearTimeout(jinaTimeout);
    }
  }

  // Default: direct server-side fetch with manual redirect re-validation (NO third-party proxy!)
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    deps.directTimeoutMs ?? DEFAULT_DIRECT_TIMEOUT_MS
  );

  try {
    let currentUrl = validation.normalizedUrl;
    let response: Response | null = null;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      response = await fetchImpl(currentUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });

      const isRedirect =
        response.status >= 300 &&
        response.status < 400 &&
        Boolean(response.headers.get('location'));

      if (!isRedirect) {
        break;
      }

      const locationHeader = response.headers.get('location')!;
      let nextUrl: string;
      try {
        nextUrl = new URL(locationHeader, currentUrl).toString();
      } catch {
        return {
          ok: false,
          status: 422,
          code: 'DIRECT_FETCH_FAILED',
          url: currentUrl,
          error: 'The page returned an invalid redirect.',
        };
      }

      if (redirectCount === MAX_REDIRECTS) {
        return {
          ok: false,
          status: 422,
          code: 'DIRECT_FETCH_FAILED',
          url: currentUrl,
          error: 'Too many redirects while fetching this page.',
        };
      }

      const redirectCheck = await validatePublicHttpUrl(nextUrl, deps.lookupAll);
      if (!redirectCheck.valid || !redirectCheck.normalizedUrl) {
        return {
          ok: false,
          status: 400,
          code: 'BLOCKED_URL',
          error: 'The page redirected to a blocked or internal address.',
        };
      }

      currentUrl = redirectCheck.normalizedUrl;
    }

    if (!response || !response.ok) {
      return {
        ok: false,
        status: 422,
        code: 'DIRECT_FETCH_FAILED',
        statusCode: response?.status,
        url: currentUrl,
        error:
          "Couldn't fetch this page directly. The website may block automated requests, require login, or be behind a paywall.",
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!isReadableTextContentType(contentType)) {
      try {
        await response.body?.cancel();
      } catch {
        // Ignore cancel error
      }
      return {
        ok: false,
        status: 415,
        code: 'UNSUPPORTED_CONTENT',
        url: currentUrl,
        contentType,
        error: `This URL returned non-text content (${contentType.split(';')[0] || 'binary'}), which cannot be imported as a web article.`,
      };
    }

    const { text: html, tooLarge } = await readResponseTextBounded(response, maxBytes);
    if (tooLarge) {
      return {
        ok: false,
        status: 413,
        code: 'RESPONSE_TOO_LARGE',
        url: currentUrl,
        error: 'The webpage is larger than the 5 MB import limit.',
      };
    }

    return {
      ok: true,
      status: 200,
      html,
      url: response.url || currentUrl,
      contentType,
      source: 'backend-direct',
    };
  } catch {
    return {
      ok: false,
      status: 422,
      code: 'DIRECT_FETCH_FAILED',
      url: validation.normalizedUrl,
      error:
        "Couldn't fetch this page directly. The website may be unreachable or block server requests.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
