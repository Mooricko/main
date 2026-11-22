import { ReaderDocument } from '../../types';
import { normalizeText, extractSuggestedTitle, detectTextDirection, countWords } from '../../utils/normalizeText';
import { buildMarkdownStructure } from '../structure/structureBuilder';

/**
 * Converts raw Markdown content into clean, distraction-free readable prose.
 * Strips formatting symbols (#, **, `, [text](url), etc.) while preserving
 * semantic headings, paragraphs, lists, quotes, and structure.
 */
export function markdownToReadableText(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // 1. Normalize line endings first
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Handle fenced code blocks: preserve inner code, remove fence syntax
  text = text.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, (_match, code) => {
    return '\n' + code.trim() + '\n';
  });
  text = text.replace(/```[\s\S]*?```/g, ''); // Unclosed or empty codeblocks

  // 3. Strip HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // 4. Convert structural HTML tags to newlines before stripping tags
  text = text.replace(/<(br|p|div|h[1-6]|li|blockquote|tr)[^>]*>/gi, '\n');
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, '\n');
  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 5. Images: ![alt](url) -> keep alt if present, remove image syntax
  text = text.replace(/!\[(.*?)\]\(.*?\)/g, (_match, alt) => {
    return alt ? `[Image: ${alt}]` : '';
  });

  // 6. Links: [text](url) -> text
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
  // Reference links: [text][ref] -> text
  text = text.replace(/\[(.*?)\]\[.*?\]/g, '$1');
  // Autolinks: <http://...> -> http://...
  text = text.replace(/<(https?:\/\/[^\s>]+)>/g, '$1');

  // 7. Headings: `# Heading` -> `Heading`
  text = text.replace(/^#{1,6}\s+(.+)$/gm, (_match, title) => {
    return `\n${title.trim()}\n`;
  });

  // 8. Blockquotes: `> quote` -> `quote`
  text = text.replace(/^\s*>\s*(.+)$/gm, '$1');

  // 9. Unordered Lists: `- item` or `* item` -> `• item`
  text = text.replace(/^\s*[-*+]\s+(.+)$/gm, '• $1');

  // 10. Horizontal Rules: `---`, `***`, `___` -> newline
  text = text.replace(/^\s*[-*_]{3,}\s*$/gm, '\n');

  // 11. Tables: Remove separator lines |---|---| and format rows
  text = text.replace(/^\s*\|?\s*[-:]+[-| :]*\|?\s*$/gm, '');
  text = text.replace(/^\s*\|\s*(.*?)\s*\|\s*$/gm, (_match, row) => {
    return row.split('|').map((col: string) => col.trim()).filter(Boolean).join(' • ');
  });

  // 12. Inline code: `code` -> code
  text = text.replace(/`([^`\n]+)`/g, '$1');

  // 13. Bold / Italic / Strikethrough
  // ***bold italic*** or ___bold italic___
  text = text.replace(/(\*{3}|_{3})(.*?)\1/g, '$2');
  // **bold** or __bold__
  text = text.replace(/(\*{2}|_{2})(.*?)\1/g, '$2');
  // *italic* or _italic_ (ensuring not in the middle of words like snake_case)
  text = text.replace(/(^|\s)\*([^*\n]+)\*(\s|$)/g, '$1$2$3');
  text = text.replace(/(^|\s)_([^_\n]+)_(\s|$)/g, '$1$2$3');
  // ~~strikethrough~~
  text = text.replace(/~~(.*?)~~/g, '$1');

  // 14. Run through general text normalizer
  return normalizeText(text);
}

/**
 * Converts and standardizes structural elements and inline accents into clean,
 * consistent Markdown format:
 *
 * Structural Elements:
 * - Headings H1–H4: #, ##, ###, #### (converts <h1>-<h6>, setext ===/---, fixes #Heading to # Heading)
 * - Blockquotes: > (converts <blockquote>, ensures > prefix on all lines, fixes >Quote to > Quote)
 * - Callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT] (converts HTML admonitions/callouts/alerts or standardizes markdown syntax)
 * - Code Blocks: ```lang\ncode\n``` (converts <pre><code> with language detection, handles unclosed fences, decodes HTML entities)
 * - Lists: - for unordered (normalizes •, *, + bullets to -), 1., 2. for ordered (converts <ol><li> with sequential numbering)
 * - Horizontal Rules: --- (converts <hr>, normalizes ***, ___, * * *, - - - to ---)
 *
 * Inline Accents:
 * - **bold** (converts <b>, <strong>, normalizes __text__ to **text**)
 * - *italic* (converts <i>, <em>, normalizes _text_ to *text*)
 * - `inline_code` (converts <code>, <kbd> to `code`, decodes entities)
 * - ~~strike~~ (converts <del>, <s>, <strike> to ~~text~~)
 */
export function cleanMarkdownContent(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // 1. Standardize line endings (\r\n and \r to \n)
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // 3. Fenced Code Blocks & <pre><code>: Protect and standardize
  const codeBlockPlaceholders: string[] = [];
  const inlineCodePlaceholders: string[] = [];

  const decodeEntities = (s: string) =>
    s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');

  // Convert HTML <pre><code ...> or <pre>...</pre> to markdown fenced code blocks first
  text = text.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (preBlock) => {
    // Find language attribute from either <pre> or <code> tag
    const langMatch = preBlock.match(/(?:class|data-lang)="[^"]*(?:language-|lang-)([a-zA-Z0-9_-]+)[^"]*"/i);
    const cleanLang = langMatch ? langMatch[1] : '';

    // Extract inner content from inside <code>...</code> if present, or inside <pre>...</pre>
    const codeMatch = preBlock.match(/<code\b[^>]*>([\s\S]*?)<\/code>/i);
    const rawCode = codeMatch ? codeMatch[1] : preBlock.replace(/<\/?pre\b[^>]*>/gi, '');
    const decoded = decodeEntities(rawCode);
    return `\n\`\`\`${cleanLang}\n${decoded.trim()}\n\`\`\`\n`;
  });

  // Extract all existing and converted ``` code blocks into placeholders so inline passes don't touch code
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const idx = codeBlockPlaceholders.length;
    const cleanBlock = `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n`;
    codeBlockPlaceholders.push(cleanBlock);
    return `\n\uE000CB_${idx}\uE000\n`;
  });

  // Convert HTML <code> and <kbd> to inline markdown backticks
  text = text.replace(/<(code|kbd)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag, code) => {
    const decoded = decodeEntities(code);
    return `\`${decoded}\``;
  });

  // Protect all inline code `...` into placeholders so bold/italic regexes don't touch code variables
  text = text.replace(/`([^`\n]+)`/g, (_match, code) => {
    const idx = inlineCodePlaceholders.length;
    inlineCodePlaceholders.push(`\`${code}\``);
    return `\uE000IC_${idx}\uE000`;
  });

  // 4. HTML Callouts / Admonitions
  // e.g. <div class="callout callout-tip"> or <aside class="admonition note">
  text = text.replace(
    /<(div|aside)\b[^>]*?(?:class="[^"]*(?:callout|admonition|alert)[^"]*?(note|tip|warning|important|caution|info)[^"]*")[^>]*?>([\s\S]*?)<\/\1>/gi,
    (_match, _tag, type, content) => {
      const calloutType = type.toLowerCase() === 'info' ? 'NOTE' : type.toUpperCase();
      const lines = content.replace(/<[^>]+>/g, ' ').trim().split('\n');
      const formatted = lines
        .map((l: string) => `> ${l.trim()}`)
        .filter((l: string) => l !== '> ')
        .join('\n');
      return `\n> [!${calloutType}]\n${formatted}\n`;
    }
  );

  // Standardize existing Markdown Callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT]
  text = text.replace(
    /^\s*>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/gim,
    (_match, type) => `> [!${type.toUpperCase()}]`
  );

  // 5. Headings H1–H4
  // HTML headings:
  text = text.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  text = text.replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  text = text.replace(/<h[56]\b[^>]*>([\s\S]*?)<\/h[56]>/gi, '\n#### $1\n');

  // Setext style headings:
  // Title
  // ===== -> # Title
  text = text.replace(/^([^\n#`>*\-][^\n]*)\n\s*={3,}\s*$/gm, '# $1');
  // Subtitle
  // -------- -> ## Subtitle
  text = text.replace(/^([^\n#`>*\-][^\n]*)\n\s*-{3,}\s*$/gm, '## $1');

  // Standardize Markdown ATX headings: ensure space after # (e.g. #Heading -> # Heading)
  text = text.replace(/^(#{1,4})([^\s#\n][^\n]*?)(?:\s+#+)?$/gm, '$1 $2');
  text = text.replace(/^(#{5,6})\s+([^\n]*)$/gm, '#### $2');

  // 6. Blockquotes
  // HTML blockquotes:
  text = text.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, quote) => {
    const lines = quote.trim().split('\n');
    const formatted = lines
      .map((l: string) => `> ${l.replace(/^>\s*/, '').trim()}`)
      .join('\n');
    return `\n${formatted}\n`;
  });

  // Standardize Markdown blockquotes: ensure space after > (e.g. >Quote -> > Quote)
  text = text.replace(/^\s*>([^\s>\[\n][^\n]*)$/gm, '> $1');

  // 7. Horizontal Rules
  // HTML <hr>:
  text = text.replace(/<hr\b[^>]*\/?>/gi, '\n\n---\n\n');
  // Markdown rules (***, ___, ---, * * *, - - -):
  text = text.replace(/^\s*(?:[-*_]\s*){3,}\s*$/gm, '---');

  // 8. Lists (Ordered and Unordered)
  // HTML Ordered lists: <ol><li>...</li></ol>
  text = text.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_match, olContent) => {
    let itemIndex = 1;
    const items = olContent.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, li: string) => {
      const res = `\n${itemIndex}. ${li.trim()}`;
      itemIndex++;
      return res;
    });
    return `\n${items}\n`;
  });

  // HTML Unordered lists: <ul><li>...</li></ul>
  text = text.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_match, ulContent) => {
    const items = ulContent.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
    return `\n${items}\n`;
  });

  // Any remaining <li> tags:
  text = text.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1\n');

  // Standardize Markdown list items:
  // Convert bullet symbols •, *, + at start of line to standard -
  text = text.replace(/^(\s*)[*+•⁃‣]\s+(.+)$/gm, '$1- $2');
  // Ensure space after - (e.g. "-item" -> "- item", avoiding -- horizontal rules)
  text = text.replace(/^(\s*)-([^\s\-\d\n][^\n]*)$/gm, '$1- $2');
  // Ensure space after numbered items (e.g. "1.Item" -> "1. Item")
  text = text.replace(/^(\s*)(\d+)[\.\)]([^\s\d\n][^\n]*)$/gm, '$1$2. $3');

  // 9. Inline Accents
  // Strikethrough: <del>, <s>, <strike> -> ~~text~~
  text = text.replace(/<(del|s|strike)\b[^>]*>([\s\S]*?)<\/\1>/gi, '~~$2~~');

  // Bold: <strong>, <b>, and __text__ -> **text**
  text = text.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  text = text.replace(/__([^\s_](?:[\s\S]*?[^\s_])?)__/g, '**$1**');

  // Italic: <em>, <i>, and _text_ -> *text*
  text = text.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  // Convert _italic_ to *italic* only when not inside a snake_case word
  text = text.replace(/(^|[\s(])_([^\s_](?:[^\n_]*?[^\s_])?)_([)\s,.:;!?]|$)/g, '$1*$2*$3');

  // 10. Links and Images
  // Images: ![alt](url) -> [Image: alt]
  text = text.replace(/!\[(.*?)\]\(.*?\)/g, (_match, alt) => (alt ? `[Image: ${alt}]` : ''));
  // Links: [text](url) -> text (prevents cluttered URLs from distracting reading)
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
  text = text.replace(/\[(.*?)\]\[.*?\]/g, '$1');
  text = text.replace(/<(https?:\/\/[^\s>]+)>/g, '$1');

  // 11. Tables: clean up separator lines (require at least one pipe | to avoid eating --- horizontal rules)
  text = text.replace(/^\s*\|?\s*[-:]+[- :]*\|[-| :]*$/gm, '');
  text = text.replace(/^\s*\|\s*(.*?)\s*\|\s*$/gm, (_match, row) => {
    return row
      .split('|')
      .map((col: string) => col.trim())
      .filter(Boolean)
      .join(' • ');
  });

  // 12. Strip remaining HTML tags and decode common entities
  text = text.replace(/<br\b\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div)>/gi, '\n\n');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeEntities(text);
  text = text.replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–');

  // 13. Restore Code Blocks & Inline Code Placeholders
  text = text.replace(/\uE000CB_(\d+)\uE000/g, (_match, id) => {
    return codeBlockPlaceholders[parseInt(id, 10)] || '';
  });

  text = text.replace(/\uE000IC_(\d+)\uE000/g, (_match, id) => {
    return inlineCodePlaceholders[parseInt(id, 10)] || '';
  });

  // 14. Ensure discrete structural paragraph breaks:
  // Headings
  text = text.replace(/([^\n])\n(#{1,4}\s+[^\n]+)/g, '$1\n\n$2');
  text = text.replace(/^(#{1,4}\s+[^\n]+)\n([^\n#])/gm, '$1\n\n$2');

  // Horizontal rules
  text = text.replace(/([^\n])\n(---)$/gm, '$1\n\n$2');
  text = text.replace(/^(---)\n([^\n])/gm, '$1\n\n$2');

  // Code blocks
  text = text.replace(/([^\n])\n(```)/g, '$1\n\n$2');
  text = text.replace(/(```[\s\S]*?```)\n([^\n])/g, '$1\n\n$2');

  // Blockquotes and Callouts
  text = text.replace(/([^\n>])\n(>\s*[^\n]+)/g, '$1\n\n$2');

  // Lists
  text = text.replace(/([^\n])\n(\s*[-*+]\s+[^\n]+)/g, '$1\n\n$2');
  text = text.replace(/([^\n])\n(\s*\d+[\.\)]\s+[^\n]+)/g, '$1\n\n$2');

  // 15. Normalize horizontal whitespace and collapse excessive blank lines
  text = text.replace(/[ \t]+/g, ' ').replace(/^[ \t]+|[ \t]+$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Reads and converts a Markdown file or raw markdown string into a ReaderDocument,
 * faithfully preserving Markdown formatting for Flow and RSVP reading.
 */
export async function extractMarkdown(
  input: File | Blob | string,
  fileName?: string
): Promise<ReaderDocument> {
  let rawText = '';

  if (typeof input === 'string') {
    rawText = input;
  } else {
    rawText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => reject(new Error('Failed to read Markdown file.'));
      reader.readAsText(input, 'utf-8');
    });
  }

  if (!rawText || !rawText.trim()) {
    throw new Error('The Markdown file is empty.');
  }

  // Check if there is an explicit top H1 heading
  const h1Match = rawText.match(/^#\s+([^\n]+)/m);
  const explicitTitle = h1Match ? h1Match[1].trim() : undefined;

  // Clean and preserve markdown formatting
  const content = cleanMarkdownContent(rawText);
  if (!content) {
    throw new Error('No readable text found in the Markdown document.');
  }

  const cleanName = fileName ? fileName.replace(/\.[^/.]+$/, '') : undefined;
  const title = explicitTitle || cleanName || extractSuggestedTitle(content, 'Markdown Document');
  const wordCount = countWords(content);
  const direction = detectTextDirection(content);

  const docId = `md_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const { structure } = buildMarkdownStructure(docId, content);

  return {
    id: docId,
    sourceType: 'markdown',
    title,
    fileName: fileName || (input instanceof File ? input.name : undefined),
    content, // Faithfully retains Markdown formatting!
    direction,
    structure,
    metadata: {
      wordCount,
    },
  };
}
