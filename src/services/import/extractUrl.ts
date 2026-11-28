import { ReaderDocument, UrlPreviewData } from '../../types';
import { normalizeText, detectTextDirection, countWords, extractSuggestedTitle } from '../../utils/normalizeText';
import { cleanMarkdownContent, markdownToReadableText } from './extractMarkdown';

export type UrlProgressCallback = (progressPercent: number, statusMessage: string) => void;

/**
 * Normalizes input string into a standard valid URL with protocol.
 */
export function formatValidUrl(input: string): string {
  let url = input.trim();
  if (url.startsWith('www.')) {
    url = `https://${url}`;
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

/**
 * Extracts clean readable prose, title, and metadata from HTML markup.
 */
export function parseHtmlArticle(html: string, originalUrl?: string): { title: string; content: string; author?: string } {
  if (typeof DOMParser === 'undefined') {
    // Node.js test environment fallback
    const ogMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
    const titleMatch = ogMatch || html.match(/<title[^>]*>([^<]+)<\/title>/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const authorMatch = html.match(/name="author"\s+content="([^"]+)"/i);
    let clean = html.replace(/<(script|style|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, '');
    clean = clean.replace(/<[^>]+>/g, ' ');
    return {
      title: titleMatch ? titleMatch[1].replace(/\s+[-|–—]\s+[^-|–—]+$/, '').trim() : (originalUrl || 'Imported Article'),
      content: normalizeText(clean),
      author: authorMatch ? authorMatch[1] : undefined,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. Extract Title
  let title = '';
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
  const docTitle = doc.title;
  const h1 = doc.querySelector('h1')?.textContent?.trim();

  title = ogTitle || twitterTitle || h1 || docTitle || 'Imported Article';
  // Clean trailing website branding like " - The New York Times" or " | Medium"
  title = title.replace(/\s+[-|–—]\s+[^-|–—]+$/, '').trim();

  // 2. Extract Author
  const author = doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
    doc.querySelector('[rel="author"]')?.textContent?.trim() ||
    undefined;

  // 3. Remove unwanted clutter
  const selectorsToRemove = [
    'script', 'style', 'noscript', 'svg', 'iframe', 'canvas',
    'nav', 'footer', 'header', 'aside', 'form', 'button', 'input',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.ad', '.ads', '.advertisement', '.social-share', '.share-buttons',
    '.cookie-banner', '#cookie-banner', '.newsletter-signup',
    '#comments', '.comments', '.sidebar', '.disclaimer', '.cookie-consent'
  ];

  selectorsToRemove.forEach((sel) => {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  });

  // 4. Find the best content container
  let articleEl: Element | null = null;

  // Prioritize semantic tags
  const candidates = [
    'article',
    '[itemprop="articleBody"]',
    'main',
    '[role="main"]',
    '.article-body',
    '.post-content',
    '.entry-content',
    '.story-content',
    '.content-article',
    '#article-body',
    '#main-content',
  ];

  for (const cand of candidates) {
    const el = doc.querySelector(cand);
    if (el && (el.textContent || '').trim().length > 150) {
      articleEl = el;
      break;
    }
  }

  // Fallback: search for container with most paragraph text
  if (!articleEl) {
    let bestScore = 0;
    const bodyElements = doc.body ? Array.from(doc.body.querySelectorAll('div, section')) : [];
    for (const el of bodyElements) {
      const paragraphs = el.querySelectorAll('p');
      const textLen = Array.from(paragraphs).reduce((acc, p) => acc + (p.textContent?.length || 0), 0);
      if (textLen > bestScore) {
        bestScore = textLen;
        articleEl = el;
      }
    }
  }

  const rootElement = articleEl || doc.body;
  if (!rootElement) {
    throw new Error('Unable to parse the content of this webpage.');
  }

  // 5. Convert readable elements to clean Markdown format
  let rawContent = rootElement.innerHTML;
  let extractedMarkdown = cleanMarkdownContent(rawContent);

  // If structured extraction was too sparse, fallback to clean root textContent
  if (extractedMarkdown.trim().length < 50) {
    extractedMarkdown = cleanMarkdownContent(rootElement.textContent || '');
  }

  if (!extractedMarkdown || extractedMarkdown.length < 30) {
    throw new Error("Couldn't extract readable article text from this page.");
  }

  return {
    title: title || originalUrl || 'Web Article',
    content: extractedMarkdown,
    author,
  };
}

/**
 * Checks if a URL points to a Wikipedia article and parses language & title.
 */
export function isWikipediaUrl(url: string): { lang: string; title: string } | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase();
    const match = host.match(/^([a-z0-9_-]+)\.wikipedia\.org$/);
    if (match) {
      const pathParts = parsed.pathname.split('/');
      const wikiIdx = pathParts.indexOf('wiki');
      if (wikiIdx !== -1 && pathParts[wikiIdx + 1]) {
        return {
          lang: match[1],
          title: decodeURIComponent(pathParts[wikiIdx + 1]),
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export type ThirdPartyProxyId = 'jina' | 'allorigins' | 'corsproxy';

export interface ThirdPartyProxyInfo {
  id: ThirdPartyProxyId;
  name: string;
  host: string;
  description: string;
}

export const THIRD_PARTY_PROXIES: readonly ThirdPartyProxyInfo[] = [
  {
    id: 'jina',
    name: 'Jina Reader',
    host: 'r.jina.ai',
    description: 'Extracts readable article Markdown via r.jina.ai',
  },
  {
    id: 'allorigins',
    name: 'AllOrigins',
    host: 'api.allorigins.win',
    description: 'Fetches page HTML via api.allorigins.win',
  },
  {
    id: 'corsproxy',
    name: 'corsproxy.io',
    host: 'corsproxy.io',
    description: 'Fetches page HTML via corsproxy.io',
  },
] as const;

export interface ExtractUrlOptions {
  /**
   * Explicitly user-approved third-party proxy provider.
   * Third-party proxies (r.jina.ai, api.allorigins.win, corsproxy.io) are NEVER
   * contacted silently; they are only used when this field is explicitly set
   * after user confirmation.
   */
  approvedProxy?: ThirdPartyProxyId;
}

export class ThirdPartyProxyConsentRequiredError extends Error {
  readonly code = 'PROXY_CONSENT_REQUIRED';
  readonly url: string;
  readonly reason: string;

  constructor(url: string, reason?: string) {
    const resolvedReason =
      reason ||
      "Couldn't fetch this page directly. The website may block automated requests, require login, or restrict cross-origin access.";
    super(resolvedReason);
    this.name = 'ThirdPartyProxyConsentRequiredError';
    this.url = url;
    this.reason = resolvedReason;
  }
}

export function isThirdPartyProxyConsentError(
  err: unknown
): err is ThirdPartyProxyConsentRequiredError {
  return (
    err instanceof ThirdPartyProxyConsentRequiredError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { code?: unknown }).code === 'PROXY_CONSENT_REQUIRED' &&
      typeof (err as { url?: unknown }).url === 'string')
  );
}

/**
 * Fetches and extracts readable text from a URL.
 *
 * By default, ONLY first-party / own-backend direct fetches are performed.
 * If direct fetching fails, throws ThirdPartyProxyConsentRequiredError so the UI
 * can ask the user before sending the URL to any third-party proxy
 * (r.jina.ai, api.allorigins.win, or corsproxy.io).
 */
export async function extractUrl(
  urlInput: string,
  onProgress?: UrlProgressCallback,
  signal?: AbortSignal,
  options?: ExtractUrlOptions
): Promise<ReaderDocument> {
  const url = formatValidUrl(urlInput);

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  let html = '';
  let markdownText = '';
  let fetchSuccessful = false;
  let directFailureReason: string | undefined;

  // Helper to fetch with timeout and external signal propagation
  const fetchWithTimeout = async (
    targetUrl: string,
    timeoutMs: number,
    init?: RequestInit
  ) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const res = await fetch(targetUrl, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
      throw err;
    }
  };

  const wikiInfo = isWikipediaUrl(url);
  const approvedProxy = options?.approvedProxy;

  if (approvedProxy) {
    // Explicit user-approved third-party proxy path — contact ONLY the approved service
    if (approvedProxy === 'jina') {
      onProgress?.(40, 'Fetching via user-approved r.jina.ai...');
      let backendHandled = false;
      try {
        const res = await fetchWithTimeout('/api/extract-url', 9500, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, thirdPartyProxy: 'jina' }),
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data?.markdown) {
          markdownText = data.markdown;
          fetchSuccessful = true;
          backendHandled = true;
        } else if (res.status === 400 && data?.code === 'BLOCKED_URL') {
          throw new Error(data.error || 'This URL cannot be fetched.');
        } else if (res.status === 422 || res.status === 413) {
          backendHandled = true;
          directFailureReason = data?.error;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || signal?.aborted) throw err;
        if (err instanceof Error && err.message && err.message.includes('cannot be fetched')) {
          throw err;
        }
        // Backend unreachable (e.g. standalone Chrome extension) -> direct approved fetch to r.jina.ai
      }

      if (!fetchSuccessful && !backendHandled) {
        try {
          const jinaRes = await fetchWithTimeout(`https://r.jina.ai/${url}`, 8500, {
            headers: {
              Accept: 'text/plain',
            },
          });
          if (jinaRes.ok) {
            const text = await jinaRes.text();
            if (text && text.trim().length > 50) {
              markdownText = text;
              fetchSuccessful = true;
            }
          }
        } catch (err: any) {
          if (err?.name === 'AbortError' || signal?.aborted) throw err;
        }
      }
    } else if (approvedProxy === 'allorigins') {
      onProgress?.(40, 'Fetching via user-approved api.allorigins.win...');
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetchWithTimeout(proxyUrl, 7000);
        if (res.ok) {
          const json = await res.json();
          if (json?.contents) {
            html = json.contents;
            fetchSuccessful = true;
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || signal?.aborted) throw err;
      }
    } else if (approvedProxy === 'corsproxy') {
      onProgress?.(40, 'Fetching via user-approved corsproxy.io...');
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const res = await fetchWithTimeout(proxyUrl, 7000);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 30) {
            html = text;
            fetchSuccessful = true;
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || signal?.aborted) throw err;
      }
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (!fetchSuccessful || (!html && !markdownText)) {
      const proxyMeta = THIRD_PARTY_PROXIES.find((p) => p.id === approvedProxy);
      throw new ThirdPartyProxyConsentRequiredError(
        url,
        directFailureReason ||
          `Could not extract this page via ${proxyMeta?.host || approvedProxy}. You can try another proxy or paste the article text directly.`
      );
    }
  } else {
    onProgress?.(15, 'Connecting to website...');

    // Step 1: Wikipedia first-party REST API (native CORS, ad-free clean HTML from Wikipedia itself)
    if (wikiInfo) {
      try {
        onProgress?.(30, 'Extracting Wikipedia article...');
        const wikiApiUrl = `https://${wikiInfo.lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(wikiInfo.title)}`;
        const res = await fetchWithTimeout(wikiApiUrl, 7000, {
          headers: {
            'Api-User-Agent': 'KhoroosReader/1.0',
          },
        });
        if (res.ok) {
          html = await res.text();
          fetchSuccessful = true;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || signal?.aborted) throw err;
        // Fall through to backend direct fetch
      }
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Step 2: Khoroos Reader backend direct fetch (/api/extract-url — never silently uses third-party proxies)
    if (!fetchSuccessful) {
      try {
        onProgress?.(35, 'Fetching article text via Khoroos Reader server...');
        const res = await fetchWithTimeout('/api/extract-url', 9500, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = typeof res.json === 'function' ? await res.json().catch(() => null) : null;

        if (res.ok && data?.html) {
          html = data.html;
          fetchSuccessful = true;
        } else if (res.ok && data?.markdown) {
          markdownText = data.markdown;
          fetchSuccessful = true;
        } else if (
          data?.code === 'BLOCKED_URL' ||
          data?.code === 'UNSUPPORTED_CONTENT' ||
          data?.code === 'RESPONSE_TOO_LARGE'
        ) {
          throw new Error(data.error || 'This URL cannot be imported.');
        } else if (data?.error) {
          directFailureReason = data.error;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || signal?.aborted) throw err;
        if (
          err instanceof Error &&
          (err.message.includes('cannot be fetched') ||
            err.message.includes('cannot be imported') ||
            err.message.includes('Only http://') ||
            err.message.includes('5 MB import limit') ||
            err.message.includes('non-text content'))
        ) {
          throw err;
        }
        // Backend endpoint unavailable (e.g. static extension), try direct browser fetch
      }
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Step 3: Direct browser fetch to the target origin itself (works when the site allows CORS)
    if (!fetchSuccessful) {
      try {
        onProgress?.(55, 'Contacting host directly...');
        const res = await fetchWithTimeout(url, 4000, {
          headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        if (res.ok) {
          html = await res.text();
          fetchSuccessful = true;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || signal?.aborted) throw err;
        // Direct fetch blocked by browser CORS policy
      }
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Step 4: Stop before contacting any third-party proxy — ask the user explicitly!
    if (!fetchSuccessful || (!html && !markdownText)) {
      throw new ThirdPartyProxyConsentRequiredError(url, directFailureReason);
    }
  }

  // If we received markdown (from reader API):
  if (markdownText) {
    onProgress?.(85, 'Cleaning article text...');
    const content = cleanMarkdownContent(markdownText);
    const title = extractSuggestedTitle(content) || (wikiInfo ? wikiInfo.title.replace(/_/g, ' ') : 'Imported Article');
    const wordCount = countWords(content);
    const direction = detectTextDirection(content);

    return {
      id: `url_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sourceType: 'url',
      title,
      sourceUrl: url,
      content,
      direction,
      metadata: {
        wordCount,
      },
    };
  }

  onProgress?.(85, 'Cleaning article text...');
  const { title, content, author } = parseHtmlArticle(html, url);

  onProgress?.(95, 'Preparing reader document...');
  const wordCount = countWords(content);
  const direction = detectTextDirection(content);

  return {
    id: `url_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sourceType: 'url',
    title: title || (wikiInfo ? wikiInfo.title.replace(/_/g, ' ') : 'Imported Article'),
    sourceUrl: url,
    content,
    direction,
    metadata: {
      author,
      wordCount,
    },
  };
}

/**
 * Quick preview fetcher: Extracts title, word count, estimated reading duration,
 * domain, and short excerpt before the user commits to the full import.
 * Keeps the full ReaderDocument preloaded so subsequent import is instant.
 */
export async function fetchUrlPreview(
  urlInput: string,
  wpm: number = 300,
  signal?: AbortSignal,
  options?: ExtractUrlOptions
): Promise<UrlPreviewData> {
  const doc = await extractUrl(urlInput, undefined, signal, options);
  const wordCount = doc.metadata?.wordCount || countWords(doc.content);
  const readingSpeed = Math.max(50, wpm || 300);
  const estimatedMinutes = Math.max(1, Math.round((wordCount / readingSpeed) * 10) / 10);

  let domain = '';
  try {
    const parsed = new URL(doc.sourceUrl || urlInput);
    domain = parsed.hostname.replace(/^www\./, '');
  } catch {
    domain = urlInput.replace(/^https?:\/\//, '').split('/')[0];
  }

  // Extract a clean 1-2 sentence excerpt from the first substantial paragraph
  const paragraphs = doc.content
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 25 && !p.startsWith('•'));

  const leadText = paragraphs[0] || doc.content;
  const excerpt = leadText.length > 150 ? `${leadText.slice(0, 147).trim()}...` : leadText;

  return {
    url: doc.sourceUrl || urlInput,
    title: doc.title || 'Untitled Article',
    wordCount,
    estimatedMinutes,
    domain,
    author: doc.metadata?.author,
    excerpt,
    document: doc,
  };
}
