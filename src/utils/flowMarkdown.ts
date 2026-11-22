import { HighlightedWordParts, DocumentStructure, HighlightStyle } from '../types';
import { splitWordParts } from './textParser';

export type FlowBlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'blockquote'
  | 'callout'
  | 'codeblock'
  | 'bullet-list'
  | 'ordered-list'
  | 'horizontal-rule'
  | 'paragraph';

export type CalloutType = 'note' | 'tip' | 'warning' | 'important';

export interface InlineMarkdownInfo {
  isInlineCode?: boolean;
  isBold?: boolean;
  isItalic?: boolean;
  isStrikethrough?: boolean;
  cleanDisplay?: string;
  cleanWordParts?: HighlightedWordParts;
}

export interface FlowWordItem {
  word: HighlightedWordParts;
  globalIndex: number;
  isPrefixToken?: boolean; // E.g. raw '#' or '-' or '>' markdown syntax token
  inlineFormatting?: InlineMarkdownInfo;
}

export interface FlowBlockMeta {
  type: FlowBlockType;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  calloutType?: CalloutType;
  listMarker?: string;
  codeLanguage?: string;
  isDivider?: boolean;
  words: FlowWordItem[];
  isRtl?: boolean;
  direction?: 'rtl' | 'ltr';
}

/**
 * Detects whether a block of words is predominantly RTL or LTR.
 * Code blocks are ALWAYS LTR.
 */
export function detectBlockDirection(
  words: Array<{ word: HighlightedWordParts; globalIndex: number }>,
  blockType?: FlowBlockType
): { isRtl: boolean; direction: 'rtl' | 'ltr' } {
  if (blockType === 'codeblock') {
    return { isRtl: false, direction: 'ltr' };
  }

  let rtlChars = 0;
  let ltrChars = 0;

  for (const item of words) {
    if (item.word?.isRtl) {
      rtlChars += 4;
    }
    const text = item.word?.original || '';
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (
        (code >= 0x0590 && code <= 0x05ff) ||
        (code >= 0x0600 && code <= 0x06ff) ||
        (code >= 0x0750 && code <= 0x077f) ||
        (code >= 0x08a0 && code <= 0x08ff) ||
        (code >= 0xfb1d && code <= 0xfdff) ||
        (code >= 0xfe70 && code <= 0xfeff)
      ) {
        rtlChars++;
      } else if (
        (code >= 65 && code <= 90) ||
        (code >= 97 && code <= 122) ||
        (code >= 0x00c0 && code <= 0x024f)
      ) {
        ltrChars++;
      }
    }
  }

  const isRtl = rtlChars > 0 && rtlChars >= ltrChars;
  return {
    isRtl,
    direction: isRtl ? 'rtl' : 'ltr',
  };
}

/**
 * Parses inline markdown accents (*italic*, **bold**, `code`, ~~strike~~)
 * while preserving the original word parts and Bionic fixation highlighting.
 */
export function parseInlineMarkdown(
  rawWord: HighlightedWordParts,
  highlightStyle: HighlightStyle = 'middle-two'
): InlineMarkdownInfo {
  const orig = rawWord.original;
  if (!orig) return {};

  let text = orig;
  let isInlineCode = false;
  let isBold = false;
  let isItalic = false;
  let isStrikethrough = false;

  // Check inline code: `code`
  if (text.startsWith('`') && text.endsWith('`') && text.length >= 2) {
    isInlineCode = true;
    text = text.slice(1, -1);
  }

  // Check bold: **text** or __text__
  if ((text.startsWith('**') && text.endsWith('**') && text.length >= 4) ||
      (text.startsWith('__') && text.endsWith('__') && text.length >= 4)) {
    isBold = true;
    text = text.slice(2, -2);
  } else if ((text.startsWith('*') && text.endsWith('*') && text.length >= 2) ||
             (text.startsWith('_') && text.endsWith('_') && text.length >= 2)) {
    // Italic: *text* or _text_
    isItalic = true;
    text = text.slice(1, -1);
  }

  // Check strikethrough: ~~text~~
  if (text.startsWith('~~') && text.endsWith('~~') && text.length >= 4) {
    isStrikethrough = true;
    text = text.slice(2, -2);
  }

  // If any markdown formatting was removed, build clean HighlightedWordParts
  // so Bionic reading highlights the clean word without awkward symbols!
  let cleanWordParts: HighlightedWordParts | undefined;
  if (isInlineCode || isBold || isItalic || isStrikethrough) {
    if (text.trim().length > 0) {
      cleanWordParts = splitWordParts(text, highlightStyle, rawWord.index);
    }
  }

  return {
    isInlineCode,
    isBold,
    isItalic,
    isStrikethrough,
    cleanDisplay: text !== orig ? text : undefined,
    cleanWordParts,
  };
}

/**
 * Classifies a paragraph group into semantic Markdown block types
 * (H1-H4, Blockquote, Callout, Code Block, Bullet List, Ordered List, Horizontal Rule, or Paragraph)
 * and prepares clean inline formatting for each word.
 */
export function classifyFlowBlock(
  words: Array<{ word: HighlightedWordParts; globalIndex: number }>,
  docStructure?: DocumentStructure | null,
  highlightStyle: HighlightStyle = 'middle-two'
): FlowBlockMeta {
  if (!words || words.length === 0) {
    return {
      type: 'paragraph',
      words: [],
      isRtl: false,
      direction: 'ltr',
    };
  }

  const meta = parseRawBlockMeta(words, docStructure, highlightStyle);
  const dirInfo = detectBlockDirection(words, meta.type);
  meta.isRtl = dirInfo.isRtl;
  meta.direction = dirInfo.direction;
  return meta;
}

function parseRawBlockMeta(
  words: Array<{ word: HighlightedWordParts; globalIndex: number }>,
  docStructure?: DocumentStructure | null,
  highlightStyle: HighlightStyle = 'middle-two'
): FlowBlockMeta {
  const firstGlobalIdx = words[0]?.globalIndex ?? 0;
  const firstWordOriginal = words[0]?.word?.original?.trim() || '';

  // 1. Check DocumentStructure for formal headings (H1, H2, H3, H4)
  if (docStructure?.sections && docStructure.sections.length > 0) {
    const matchingSection = docStructure.sections.find(
      (sec) =>
        sec.startWordIndex === firstGlobalIdx ||
        (sec.startWordIndex >= firstGlobalIdx && sec.startWordIndex <= (words[1]?.globalIndex ?? firstGlobalIdx))
    );

    if (matchingSection) {
      const level = Math.min(6, Math.max(1, matchingSection.level || 1)) as 1 | 2 | 3 | 4 | 5 | 6;
      let blockType: FlowBlockType = 'h1';
      if (level === 2) blockType = 'h2';
      else if (level === 3) blockType = 'h3';
      else if (level >= 4) blockType = 'h4';

      return {
        type: blockType,
        headingLevel: level,
        words: words.map((item, idx) => {
          // If first token is raw markdown hash (#, ##), mark as prefix token
          const isHashPrefix = idx === 0 && /^#{1,6}$/.test(item.word.original);
          return {
            ...item,
            isPrefixToken: isHashPrefix,
            inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
          };
        }),
      };
    }
  }

  // 2. Check for Horizontal Rule: ---, ***, ___, ===
  if (words.length <= 2 && /^(?:-{3,}|\*{3,}|_{3,}|={3,})$/.test(firstWordOriginal)) {
    return {
      type: 'horizontal-rule',
      isDivider: true,
      words: words.map((item) => ({
        ...item,
        inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
      })),
    };
  }

  // 3. Check for Markdown Headings (# Heading, ## Subheading, ### Section)
  const headingHashMatch = /^(#{1,6})(?:\s*|$)/.exec(firstWordOriginal);
  if (headingHashMatch) {
    const level = Math.min(6, headingHashMatch[1].length) as 1 | 2 | 3 | 4 | 5 | 6;
    let blockType: FlowBlockType = 'h1';
    if (level === 2) blockType = 'h2';
    else if (level === 3) blockType = 'h3';
    else if (level >= 4) blockType = 'h4';

    const isStandaloneHash = firstWordOriginal === headingHashMatch[1];

    return {
      type: blockType,
      headingLevel: level,
      words: words.map((item, idx) => {
        if (idx === 0) {
          if (isStandaloneHash) {
            return {
              ...item,
              isPrefixToken: true,
              inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
            };
          } else {
            // First word was attached, e.g. "#Introduction" -> clean display "Introduction"
            const cleanText = item.word.original.slice(level).trim();
            const cleanParts = cleanText ? splitWordParts(cleanText, highlightStyle, item.globalIndex) : undefined;
            return {
              ...item,
              inlineFormatting: {
                cleanDisplay: cleanText || undefined,
                cleanWordParts: cleanParts,
              },
            };
          }
        }
        return {
          ...item,
          inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
        };
      }),
    };
  }

  // 4. Check for Fenced Code Block: ```ts ... ``` or starts with ```
  if (firstWordOriginal.startsWith('```') || words.some((w) => w.word.original.startsWith('```'))) {
    // Extract language name if attached to backticks, e.g. ```typescript -> typescript
    let lang = '';
    const langMatch = /^```([a-zA-Z0-9_-]+)/.exec(firstWordOriginal);
    if (langMatch) {
      lang = langMatch[1];
    }

    return {
      type: 'codeblock',
      codeLanguage: lang || 'code',
      words: words.map((item, idx) => {
        const isFence = idx === 0 && item.word.original.startsWith('```');
        const isEndingFence = idx === words.length - 1 && item.word.original.endsWith('```');
        return {
          ...item,
          isPrefixToken: isFence || isEndingFence,
          inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
        };
      }),
    };
  }

  // 5. Check for Callouts / Admonitions: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT]
  // or Note:, Tip:, Warning:, Important:
  const joinedSnippet = words.slice(0, 4).map((w) => w.word.original).join(' ');
  const calloutRegex = /^(?:>\s*)?\[!(NOTE|TIP|WARNING|IMPORTANT)\]/i;
  const calloutMatch = calloutRegex.exec(joinedSnippet);

  if (calloutMatch) {
    const rawKind = calloutMatch[1].toLowerCase();
    const calloutType: CalloutType =
      rawKind === 'tip'
        ? 'tip'
        : rawKind === 'warning'
        ? 'warning'
        : rawKind === 'important'
        ? 'important'
        : 'note';

    return {
      type: 'callout',
      calloutType,
      words: words.map((item, idx) => {
        const isCalloutTag =
          (idx === 0 && (item.word.original === '>' || item.word.original.startsWith('>'))) ||
          /\[!(NOTE|TIP|WARNING|IMPORTANT)\]/i.test(item.word.original);

        return {
          ...item,
          isPrefixToken: isCalloutTag,
          inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
        };
      }),
    };
  }

  // 6. Check for Blockquote: starts with > or “ or »
  if (firstWordOriginal.startsWith('>') || firstWordOriginal === '>') {
    const isStandaloneQuote = firstWordOriginal === '>';
    return {
      type: 'blockquote',
      words: words.map((item, idx) => {
        if (idx === 0) {
          if (isStandaloneQuote) {
            return {
              ...item,
              isPrefixToken: true,
              inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
            };
          } else {
            // Strip leading '>' for clean visual rendering
            const cleanText = item.word.original.replace(/^>+/, '').trim();
            const cleanParts = cleanText ? splitWordParts(cleanText, highlightStyle, item.globalIndex) : undefined;
            return {
              ...item,
              inlineFormatting: {
                cleanDisplay: cleanText || undefined,
                cleanWordParts: cleanParts,
              },
            };
          }
        }
        return {
          ...item,
          inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
        };
      }),
    };
  }

  // 7. Check for Unordered Bullet List: •, -, *, +, ⁃, ‣
  const bulletMatch = /^([•\-*+⁃‣–])(?:\s+|$)/.exec(firstWordOriginal);
  if (bulletMatch || firstWordOriginal === '•' || firstWordOriginal === '-' || firstWordOriginal === '*') {
    const marker = bulletMatch ? bulletMatch[1] : firstWordOriginal;
    const isStandaloneBullet = firstWordOriginal === marker;

    return {
      type: 'bullet-list',
      listMarker: marker,
      words: words.map((item, idx) => {
        if (idx === 0) {
          if (isStandaloneBullet) {
            return {
              ...item,
              isPrefixToken: true,
              inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
            };
          } else {
            const cleanText = item.word.original.slice(marker.length).trim();
            const cleanParts = cleanText ? splitWordParts(cleanText, highlightStyle, item.globalIndex) : undefined;
            return {
              ...item,
              inlineFormatting: {
                cleanDisplay: cleanText || undefined,
                cleanWordParts: cleanParts,
              },
            };
          }
        }
        return {
          ...item,
          inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
        };
      }),
    };
  }

  // 8. Check for Ordered Numbered List: 1., 2., 1), (1), [1]
  const orderedMatch = /^(\(?\d+[\.\)]|\[\d+\])/.exec(firstWordOriginal);
  if (orderedMatch) {
    const marker = orderedMatch[1];
    const isStandaloneNumber = firstWordOriginal === marker;

    return {
      type: 'ordered-list',
      listMarker: marker,
      words: words.map((item, idx) => {
        if (idx === 0) {
          if (isStandaloneNumber) {
            return {
              ...item,
              isPrefixToken: true,
              inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
            };
          } else {
            const cleanText = item.word.original.slice(marker.length).trim();
            const cleanParts = cleanText ? splitWordParts(cleanText, highlightStyle, item.globalIndex) : undefined;
            return {
              ...item,
              inlineFormatting: {
                cleanDisplay: cleanText || undefined,
                cleanWordParts: cleanParts,
              },
            };
          }
        }
        return {
          ...item,
          inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
        };
      }),
    };
  }

  // 9. Standard Paragraph with inline formatting
  return {
    type: 'paragraph',
    words: words.map((item) => ({
      ...item,
      inlineFormatting: parseInlineMarkdown(item.word, highlightStyle),
    })),
  };
}
