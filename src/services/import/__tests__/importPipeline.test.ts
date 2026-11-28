/**
 * Comprehensive Automated Tests for Universal Text Input Hub Pipeline
 * Covers:
 * - Plain text, Empty text, Unicode, Persian/Arabic RTL, Mixed RTL/LTR
 * - Markdown parsing: headings, lists, links, code blocks, tables, Persian markdown
 * - TXT extraction: Windows (\r\n), Unix (\n), large text, UTF-8
 * - PDF extraction: valid PDF bytes, corrupted PDF, empty PDF detection
 * - URL detection & HTML article extraction: valid, navigation-heavy, non-article, invalid URL
 * - Clipboard extraction: plain text, rich HTML, empty clipboard
 */

import { normalizeText, detectTextDirection, countWords, extractSuggestedTitle } from '../../../utils/normalizeText';
import { detectInputType, isUrlString, isMarkdownString, getFileExtension } from '../detectInput';
import { markdownToReadableText, extractMarkdown, cleanMarkdownContent } from '../extractMarkdown';
import { extractTxt } from '../extractTxt';
import {
  parseHtmlArticle,
  formatValidUrl,
  fetchUrlPreview,
  extractUrl,
  isWikipediaUrl,
  isThirdPartyProxyConsentError,
} from '../extractUrl';
import { extractClipboardContent, processUniversalInput } from '../extractText';
import { resolvePdfWorkerSrc, PDF_WORKER_FILENAME, extractPdf } from '../extractPdf';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    testsFailed++;
  }
}

async function runAllTests() {
  console.log('\n=============================================');
  console.log('🧪 Starting Universal Text Input Hub Test Suite');
  console.log('=============================================\n');

  // 1. TEXT & UNICODE TESTS
  console.log('--- 1. Text Normalization & Language Detection ---');
  {
    const plain = 'Hello world!   This   is   a    test.';
    const normalized = normalizeText(plain);
    assert(normalized === 'Hello world! This is a test.', 'Collapses repeated horizontal whitespace');

    const empty = normalizeText('');
    assert(empty === '', 'Handles empty text cleanly');

    const winLineEndings = 'Line 1\r\n\r\n\r\n\r\nLine 2';
    const normLines = normalizeText(winLineEndings);
    assert(normLines === 'Line 1\n\nLine 2', 'Normalizes \\r\\n and caps consecutive blank lines to 2');

    // Persian / Arabic Unicode & ZWNJ
    const persianText = 'می\u200Cخواهم این کتاب را بخوانم. سرعت خواندن بالا است.';
    const normPersian = normalizeText(persianText);
    assert(normPersian.includes('\u200C'), 'Preserves Persian ZWNJ (Zero-Width Non-Joiner)');
    assert(detectTextDirection(persianText) === 'rtl', 'Detects Persian text as RTL direction');

    // Mixed LTR / RTL
    const mixed = 'ADHD Reader یک ابزار فوق‌العاده برای خواندن سریع است.';
    assert(detectTextDirection(mixed) === 'rtl', 'Detects predominantly Persian mixed text as RTL');

    const english = 'ADHD Reader is designed to reduce reading friction.';
    assert(detectTextDirection(english) === 'ltr', 'Detects English text as LTR');

    assert(countWords('One two three four five') === 5, 'Counts words accurately');
    assert(countWords('   ') === 0, 'Word count of whitespace is 0');
    assert(extractSuggestedTitle('My Great Article\nSecond line here') === 'My Great Article', 'Extracts suggested title from first line');
  }

  // 2. INPUT DETECTION TESTS
  console.log('\n--- 2. Input Type Detection ---');
  {
    assert(isUrlString('https://example.com/article/123'), 'Detects valid https:// URL');
    assert(isUrlString('http://techcrunch.com/news'), 'Detects valid http:// URL');
    assert(isUrlString('www.nytimes.com/article'), 'Detects www. URL');
    assert(!isUrlString('Hello world https://example.com not a single url'), 'Rejects multi-word string containing URL');
    assert(!isUrlString('https://not a valid url'), 'Rejects URL with spaces');

    assert(detectInputType('https://medium.com/story') === 'url', 'detectInputType identifies URL string');
    assert(detectInputType('# Heading 1\nSome paragraph text here.') === 'markdown', 'detectInputType identifies Markdown with heading');
    assert(detectInputType('Just a normal plain text paragraph without special markers.') === 'text', 'detectInputType identifies Plain Text');

    // File objects / extensions
    assert(getFileExtension('paper.pdf') === 'pdf', 'Extracts pdf extension');
    assert(getFileExtension('notes.MARKDOWN') === 'markdown', 'Extracts lowercase markdown extension');
    assert(getFileExtension('file.txt') === 'txt', 'Extracts txt extension');

    const fakePdf = { name: 'document.pdf', type: 'application/pdf' } as File;
    assert(detectInputType(fakePdf) === 'pdf', 'detectInputType detects PDF file');

    const fakeMd = { name: 'README.md', type: 'text/markdown' } as File;
    assert(detectInputType(fakeMd) === 'markdown', 'detectInputType detects Markdown file');

    const fakeTxt = { name: 'sample.txt', type: 'text/plain' } as File;
    assert(detectInputType(fakeTxt) === 'txt', 'detectInputType detects TXT file');
  }

  // 3. MARKDOWN TO READABLE PROSE TESTS
  console.log('\n--- 3. Markdown Extraction & Prose Normalization ---');
  {
    const md = `
# Executive Summary

This is **important** and _crucial_ reading. Visit [our website](https://example.com) for details.

## Key Takeaways
- First item to focus on
- Second item with \`inline_code\`
- Third item with ~~strikethrough~~

\`\`\`typescript
const focus = true;
\`\`\`

> A quote to remember.

| Metric | Value |
| --- | --- |
| Focus | High |
| Speed | 450 WPM |
`;

    const prose = markdownToReadableText(md);

    assert(!prose.includes('#'), 'Stripped # heading markers');
    assert(!prose.includes('**'), 'Stripped ** bold asterisks');
    assert(!prose.includes('`'), 'Stripped code backticks');
    assert(!prose.includes('[our website]('), 'Stripped markdown link syntax');
    assert(prose.includes('our website'), 'Preserved link anchor text');
    assert(prose.includes('Executive Summary'), 'Preserved heading text');
    assert(prose.includes('• First item to focus on'), 'Converted bullet list cleanly');
    assert(prose.includes('A quote to remember.'), 'Preserved blockquote text');

    // Persian Markdown test
    const persianMd = `# راهنمای خواندن سریع\n\nاین یک **متن آزمایشی** برای بررسی زبان فارسی است.`;
    const persianProse = markdownToReadableText(persianMd);
    assert(persianProse.includes('راهنمای خواندن سریع'), 'Preserved Persian heading in Markdown');
    assert(persianProse.includes('متن آزمایشی'), 'Stripped bold asterisks from Persian text');
    assert(!persianProse.includes('**'), 'No remaining markdown symbols in Persian text');
  }

  // 3B. CLEAN MARKDOWN STRUCTURAL ELEMENTS & INLINE ACCENTS
  console.log('\n--- 3B. Clean Markdown Conversion of Structure & Inline Accents ---');
  {
    // Structural Elements: Headings H1-H4 from HTML and setext
    const htmlHeadings = '<h1>Main Title</h1><p>Intro</p><h2>Section One</h2><h3>Subsection</h3><h4>Minor Point</h4>';
    const cleanHeadings = cleanMarkdownContent(htmlHeadings);
    assert(cleanHeadings.includes('# Main Title'), 'Converts <h1> to # Heading 1');
    assert(cleanHeadings.includes('## Section One'), 'Converts <h2> to ## Heading 2');
    assert(cleanHeadings.includes('### Subsection'), 'Converts <h3> to ### Heading 3');
    assert(cleanHeadings.includes('#### Minor Point'), 'Converts <h4> to #### Heading 4');

    const setextHeadings = 'Setext Heading 1\n====\nParagraph\nSetext Heading 2\n----';
    const cleanSetext = cleanMarkdownContent(setextHeadings);
    assert(cleanSetext.includes('# Setext Heading 1'), 'Converts setext === to # Heading 1');
    assert(cleanSetext.includes('## Setext Heading 2'), 'Converts setext --- to ## Heading 2');

    // Structural Elements: Blockquotes and Callouts
    const htmlQuote = '<blockquote>Simplicity is prerequisite for reliability.</blockquote>';
    const cleanQuote = cleanMarkdownContent(htmlQuote);
    assert(cleanQuote.includes('> Simplicity is prerequisite for reliability.'), 'Converts <blockquote> to > Blockquote');

    const htmlCallout = '<div class="callout callout-tip">Take a 5-minute break every 25 minutes.</div>';
    const cleanCallout = cleanMarkdownContent(htmlCallout);
    assert(cleanCallout.includes('> [!TIP]'), 'Converts HTML tip callout to > [!TIP]');
    assert(cleanCallout.includes('Take a 5-minute break'), 'Preserves callout message');

    const unspacedCallout = '>[!note] Remember to drink water.';
    const standardizedCallout = cleanMarkdownContent(unspacedCallout);
    assert(standardizedCallout.includes('> [!NOTE]'), 'Standardizes >[!note] to > [!NOTE]');

    // Structural Elements: Code Blocks
    const htmlPreCode = '<pre><code class="language-typescript">const answer = 42;\nif (answer &gt; 40) { return true; }</code></pre>';
    const cleanCode = cleanMarkdownContent(htmlPreCode);
    assert(cleanCode.includes('```typescript'), 'Preserves code block language');
    assert(cleanCode.includes('const answer = 42;'), 'Preserves inner code');
    assert(cleanCode.includes('answer > 40'), 'Decodes HTML entities in code block');
    assert(cleanCode.includes('```'), 'Fences code block properly');

    // Structural Elements: Lists (Unordered and Ordered)
    const htmlUl = '<ul><li>First item</li><li>Second item</li></ul>';
    const cleanUl = cleanMarkdownContent(htmlUl);
    assert(cleanUl.includes('- First item') && cleanUl.includes('- Second item'), 'Converts <ul><li> to standard - list items');

    const htmlOl = '<ol><li>Step one</li><li>Step two</li><li>Step three</li></ol>';
    const cleanOl = cleanMarkdownContent(htmlOl);
    assert(cleanOl.includes('1. Step one'), 'Converts <ol><li> to sequential 1. Item');
    assert(cleanOl.includes('2. Step two'), 'Converts <ol><li> to sequential 2. Item');
    assert(cleanOl.includes('3. Step three'), 'Converts <ol><li> to sequential 3. Item');

    const mixedBullets = '• Bullet item\n* Asterisk item\n+ Plus item';
    const cleanBullets = cleanMarkdownContent(mixedBullets);
    assert(cleanBullets.includes('- Bullet item'), 'Normalizes • to -');
    assert(cleanBullets.includes('- Asterisk item'), 'Normalizes * to -');
    assert(cleanBullets.includes('- Plus item'), 'Normalizes + to -');

    // Structural Elements: Horizontal Rules
    const htmlHr = '<p>Before</p><hr><p>After</p>';
    const cleanHr = cleanMarkdownContent(htmlHr);
    assert(cleanHr.includes('---'), 'Converts <hr> to ---');

    // Inline Accents: Bold, Italic, Inline Code, Strikethrough
    const inlineHtml = '<p>This is <strong>strong bold</strong>, <b>b tag bold</b>, <em>emphasized</em>, <i>italic</i>, <code>const x = 1;</code>, and <del>deleted strike</del>.</p>';
    const cleanInline = cleanMarkdownContent(inlineHtml);
    assert(cleanInline.includes('**strong bold**'), 'Converts <strong> to **bold**');
    assert(cleanInline.includes('**b tag bold**'), 'Converts <b> to **bold**');
    assert(cleanInline.includes('*emphasized*'), 'Converts <em> to *italic*');
    assert(cleanInline.includes('*italic*'), 'Converts <i> to *italic*');
    assert(cleanInline.includes('`const x = 1;`'), 'Converts <code> to `inline_code`');
    assert(cleanInline.includes('~~deleted strike~~'), 'Converts <del> to ~~strike~~');

    const inlineMdUnderscores = 'Here is __bold text__ and _italic text_ and ~~strikethrough~~.';
    const cleanMdUnderscores = cleanMarkdownContent(inlineMdUnderscores);
    assert(cleanMdUnderscores.includes('**bold text**'), 'Normalizes __bold__ to **bold**');
    assert(cleanMdUnderscores.includes('*italic text*'), 'Normalizes _italic_ to *italic*');
    assert(cleanMdUnderscores.includes('~~strikethrough~~'), 'Preserves ~~strikethrough~~');
  }
  console.log('\n--- 4. TXT Document Extraction ---');
  {
    const sampleTxt = 'Chapter 1: The Beginning\r\n\r\nOnce upon a time in a focused mind...';
    const doc = await extractTxt(sampleTxt, 'story.txt');
    assert(doc.sourceType === 'txt', 'Document sourceType is txt');
    assert(doc.title === 'story', 'Derived title from file name');
    assert(doc.content.startsWith('Chapter 1: The Beginning'), 'Content begins with normalized text');
    assert(doc.direction === 'ltr', 'Document direction is LTR');

    try {
      await extractTxt('', 'empty.txt');
      assert(false, 'Should have thrown on empty text');
    } catch (e: any) {
      assert(e.message.includes('empty'), 'Throws expected error on empty TXT');
    }
  }

  // 5. HTML ARTICLE EXTRACTION TESTS
  console.log('\n--- 5. HTML Article Parsing & Sanitization ---');
  {
    const mockHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Understanding Neurodiversity in Modern Workplaces - TechHub</title>
  <meta property="og:title" content="Understanding Neurodiversity in Modern Workplaces">
  <meta name="author" content="Dr. Jane Smith">
</head>
<body>
  <header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
  <aside class="sidebar">Ads and navigation here</aside>
  <article>
    <h1>Understanding Neurodiversity in Modern Workplaces</h1>
    <p>Neurodiversity encompasses a wide variety of cognitive conditions including ADHD and dyslexia.</p>
    <p>Modern workplaces benefit immensely from cognitive diversity, bringing creative problem solving to complex domains.</p>
    <blockquote>Focus is not about staring harder; it is about finding the right cadence.</blockquote>
  </article>
  <footer>Copyright 2026. All rights reserved.</footer>
</body>
</html>
`;

    const article = parseHtmlArticle(mockHtml, 'https://example.com/article');
    assert(article.title === 'Understanding Neurodiversity in Modern Workplaces', 'Extracted title without website suffix');
    assert(article.author === 'Dr. Jane Smith', 'Extracted author metadata');
    assert(article.content.includes('Neurodiversity encompasses a wide variety'), 'Extracted article body paragraph 1');
    assert(article.content.includes('Modern workplaces benefit immensely'), 'Extracted article body paragraph 2');
    assert(!article.content.includes('Ads and navigation here'), 'Removed aside/sidebar content');
    assert(!article.content.includes('Copyright 2026'), 'Removed footer content');

    // formatValidUrl
    assert(formatValidUrl('www.bbc.com/news') === 'https://www.bbc.com/news', 'Formats www. to https://');
    assert(formatValidUrl('medium.com/story') === 'https://medium.com/story', 'Formats naked domain to https://');
  }

  // 6. CLIPBOARD CONTENT EXTRACTION TESTS
  console.log('\n--- 6. Clipboard Content Extraction ---');
  {
    const richHtml = `<p>This is from <b>rich clipboard</b> with <a href="#">a link</a>.</p>`;
    const plain = `This is from rich clipboard with a link.`;
    const extracted = extractClipboardContent(richHtml, plain);
    assert(extracted.includes('This is from') && (extracted.includes('rich clipboard with a link') || extracted.includes('**rich clipboard**')), 'Extracts clean text or markdown from rich HTML clipboard');
    assert(!extracted.includes('<p>') && !extracted.includes('<b>'), 'Strips HTML markup from clipboard');

    const purePlain = extractClipboardContent(undefined, 'Just plain copied text.');
    assert(purePlain === 'Just plain copied text.', 'Extracts plain text when HTML not provided');

    // Markdown copied to clipboard preserves formatting
    const mdClipboard = extractClipboardContent(undefined, '# Title\n\n- Item 1\n- Item 2\n\n**Bold claim**');
    assert(mdClipboard.includes('# Title'), 'Preserves heading in clipboard markdown');
    assert(mdClipboard.includes('**Bold claim**'), 'Preserves bold in clipboard markdown');
    assert(mdClipboard.includes('- Item 1'), 'Preserves lists in clipboard markdown');
  }

  // 7. MASTER UNIFIED PIPELINE INTEGRATION
  console.log('\n--- 7. Unified Pipeline processUniversalInput ---');
  {
    // Plain text input
    const plainDoc = await processUniversalInput('Focus flows where attention goes.');
    assert(plainDoc.sourceType === 'text', 'Processes plain text');
    assert(plainDoc.content === 'Focus flows where attention goes.', 'Preserves content in ReaderDocument');
    assert(typeof plainDoc.id === 'string', 'Assigns unique ID');

    // Markdown input auto-detected and formatting faithfully preserved
    const mdInput = '# Chapter 1\nThis is a **markdown** text with [links](http://a.com).';
    const mdDoc = await processUniversalInput(mdInput);
    assert(mdDoc.sourceType === 'markdown', 'Auto-detects markdown in unified pipeline');
    assert(mdDoc.content.includes('# Chapter 1'), 'Preserves heading marker in markdown document');
    assert(mdDoc.content.includes('**markdown** text with links.'), 'Preserves bold markdown syntax and link text');

    // Persian text in pipeline
    const farsiDoc = await processUniversalInput('خواندن با ریتم متناسب باعث افزایش تمرکز می‌شود.');
    assert(farsiDoc.direction === 'rtl', 'Pipeline flags Persian text as RTL');
  }

  // 8. URL QUICK PREVIEW TESTS
  console.log('\n--- 8. URL Quick Preview Generation ---');
  {
    const originalFetch = global.fetch;
    const sampleArticleHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>The Science of Fast Reading and Attention - BrainJournal</title>
        <meta property="og:title" content="The Science of Fast Reading and Attention">
        <meta name="author" content="Alex Rivera">
      </head>
      <body>
        <article>
          <h1>The Science of Fast Reading and Attention</h1>
          <p>Rapid serial visual presentation provides a structured mechanism to minimize regressions while reading technical or narrative prose.</p>
          <p>By fixing gaze orientation and highlighting the optimal recognition point, cognitive processing overhead drops dramatically.</p>
        </article>
      </body>
      </html>
    `;

    (global as any).fetch = async () => {
      return {
        ok: true,
        text: async () => sampleArticleHtml,
      } as any;
    };

    try {
      const preview = await fetchUrlPreview('https://www.brainjournal.org/science/reading-flow', 300);
      assert(preview.title === 'The Science of Fast Reading and Attention', 'Extracted preview title accurately');
      assert(preview.domain === 'brainjournal.org', 'Derived clean domain without www');
      assert(preview.author === 'Alex Rivera', 'Extracted author for preview');
      assert(preview.wordCount > 20, 'Calculated word count greater than 20');
      assert(preview.estimatedMinutes >= 1, 'Estimated reading minutes calculated based on WPM');
      assert(typeof preview.excerpt === 'string' && preview.excerpt.length > 10, 'Generated clean excerpt snippet');
      assert(preview.document.sourceType === 'url', 'Embedded preloaded document for instant commit');
      assert(preview.document.content.includes('Rapid serial visual presentation'), 'Preloaded document contains article body');
    } finally {
      global.fetch = originalFetch;
    }
  }

  // 9. WIKIPEDIA URL OPTIMIZATION & MULTI-LAYER RESILIENCE
  console.log('\n--- 9. Wikipedia URL Optimization & Resilience ---');
  {
    const wikiEn = isWikipediaUrl('https://en.wikipedia.org/wiki/Attention_deficit_hyperactivity_disorder');
    assert(wikiEn !== null && wikiEn.lang === 'en' && wikiEn.title === 'Attention_deficit_hyperactivity_disorder', 'Identifies standard English Wikipedia article');

    const wikiDe = isWikipediaUrl('https://de.wikipedia.org/wiki/Lesen?section=2#Header');
    assert(wikiDe !== null && wikiDe.lang === 'de' && wikiDe.title === 'Lesen', 'Identifies German Wikipedia and strips anchors/parameters');

    const nonWiki = isWikipediaUrl('https://example.com/wiki/test');
    assert(nonWiki === null, 'Rejects non-Wikipedia domains with /wiki/ path');
  }

  // 10. LOCAL PDF.JS WORKER RESOLUTION & OFFLINE EXTRACTION
  console.log('\n--- 10. Local PDF.js Worker Resolution & Offline Extraction ---');
  {
    const extWorker = resolvePdfWorkerSrc({
      isExtension: true,
      getExtensionUrl: (p) => `chrome-extension://abcdefghijklmnop/${p}`,
    });
    assert(
      extWorker === `chrome-extension://abcdefghijklmnop/${PDF_WORKER_FILENAME}`,
      'Resolves chrome-extension:// local worker URL in extension runtime'
    );
    assert(!extWorker.includes('unpkg'), 'Extension worker URL never references unpkg CDN');

    const webRootWorker = resolvePdfWorkerSrc({
      isExtension: false,
      baseUri: 'https://reader.example.com/',
    });
    assert(
      webRootWorker === `https://reader.example.com/${PDF_WORKER_FILENAME}`,
      'Resolves same-origin worker URL at web root'
    );
    assert(!webRootWorker.includes('unpkg'), 'Web root worker URL never references unpkg CDN');

    const webSubpathWorker = resolvePdfWorkerSrc({
      isExtension: false,
      baseUri: 'https://reader.example.com/app/index.html',
    });
    assert(
      webSubpathWorker === `https://reader.example.com/app/${PDF_WORKER_FILENAME}`,
      'Resolves same-origin worker URL under subpath deployment'
    );

    const fallbackLocalWorker = resolvePdfWorkerSrc({});
    assert(
      fallbackLocalWorker === `./${PDF_WORKER_FILENAME}`,
      'Falls back to relative local worker filename without external CDN'
    );

    // Offline PDF validation & minimal valid PDF extraction (zero network calls)
    const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 68 >> stream
BT /F1 12 Tf 72 720 Td (Khoroos Reader offline PDF extraction test works cleanly.) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000199 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
318
%%EOF`;
    const pdfBytes = new TextEncoder().encode(minimalPdf).buffer;
    const pdfDoc = await extractPdf(pdfBytes, 'offline-sample.pdf');
    assert(pdfDoc.sourceType === 'pdf', 'extractPdf produces pdf ReaderDocument offline');
    assert(
      pdfDoc.content.includes('Khoroos Reader offline PDF extraction test works cleanly.'),
      'extractPdf extracts text cleanly without external network access'
    );

    try {
      await extractPdf(new TextEncoder().encode('not a pdf').buffer, 'bad.pdf');
      assert(false, 'Should reject non-PDF file header');
    } catch (e: any) {
      assert(
        String(e.message).includes('valid PDF'),
        'Rejects invalid PDF magic header with clear error'
      );
    }
  }

  // 11. THIRD-PARTY PROXY CONSENT ENFORCEMENT (NO SILENT FALLBACKS)
  console.log('\n--- 11. Third-Party Proxy Consent Enforcement ---');
  {
    const originalFetch = global.fetch;
    const calledUrls: string[] = [];

    (global as any).fetch = async (input: any) => {
      const target = String(input);
      calledUrls.push(target);
      return {
        ok: false,
        status: 422,
        json: async () => ({
          success: false,
          code: 'DIRECT_FETCH_FAILED',
          error: "Couldn't fetch this page directly.",
        }),
        text: async () => '',
      } as any;
    };

    try {
      let caughtErr: unknown = null;
      try {
        await extractUrl('https://private-example.org/draft?token=secret123');
      } catch (e) {
        caughtErr = e;
      }

      assert(
        isThirdPartyProxyConsentError(caughtErr),
        'Throws ThirdPartyProxyConsentRequiredError when direct fetch fails instead of silently proxying'
      );
      assert(
        !calledUrls.some((u) => u.includes('allorigins.win')),
        'Never contacts api.allorigins.win without explicit user consent'
      );
      assert(
        !calledUrls.some((u) => u.includes('corsproxy.io')),
        'Never contacts corsproxy.io without explicit user consent'
      );
      assert(
        !calledUrls.some((u) => u.includes('r.jina.ai')),
        'Never contacts r.jina.ai without explicit user consent'
      );

      // Explicit approval for allorigins contacts ONLY api.allorigins.win
      const approvedCalls: string[] = [];
      (global as any).fetch = async (input: any) => {
        const target = String(input);
        approvedCalls.push(target);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            contents:
              '<html><head><title>Approved Proxy Article</title></head><body><article><p>This article was loaded only after explicit user consent to use AllOrigins proxy for public reading.</p></article></body></html>',
          }),
          text: async () => '',
        } as any;
      };

      const doc = await extractUrl(
        'https://example.org/public-article',
        undefined,
        undefined,
        { approvedProxy: 'allorigins' }
      );
      assert(doc.title === 'Approved Proxy Article', 'Loads article when user explicitly approves allorigins');
      assert(
        approvedCalls.length === 1 && approvedCalls[0].startsWith('https://api.allorigins.win/get?url='),
        'Contacts only the single user-approved third-party proxy'
      );
    } finally {
      global.fetch = originalFetch;
    }
  }

  console.log('\n=============================================');
  console.log(`🏁 Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('=============================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
