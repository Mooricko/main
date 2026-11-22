import assert from 'node:assert';
import test, { describe, it } from 'node:test';
import { classifyFlowBlock, parseInlineMarkdown, detectBlockDirection } from '../../utils/flowMarkdown';
import { splitWordParts } from '../../utils/textParser';
import { HighlightedWordParts, DocumentStructure } from '../../types';

describe('FlowReader Markdown Format Styling & Classification', () => {
  const makeWord = (
    original: string,
    globalIndex: number,
    paragraphIndex: number = 0
  ): HighlightedWordParts => ({
    original,
    prefixPunct: '',
    beforeHighlight: '',
    highlightedText: original,
    afterHighlight: '',
    suffixPunct: '',
    isRtl: false,
    hasSentenceEnd: false,
    hasClausePause: false,
    hasParagraphBreak: false,
    paragraphIndex,
    index: globalIndex,
  });

  it('1. Classifies Markdown H1, H2, H3, and H4 headings correctly', () => {
    // H1 with space
    const h1Words = ['#', 'Introduction', 'to', 'Deep', 'Focus'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const h1Block = classifyFlowBlock(h1Words);
    assert.strictEqual(h1Block.type, 'h1');
    assert.strictEqual(h1Block.headingLevel, 1);
    assert.strictEqual(h1Block.words[0].isPrefixToken, true);

    // H2 with attached hash
    const h2Words = ['##Methods', 'and', 'Procedures'].map((w, idx) => ({
      word: makeWord(w, idx + 10),
      globalIndex: idx + 10,
    }));
    const h2Block = classifyFlowBlock(h2Words);
    assert.strictEqual(h2Block.type, 'h2');
    assert.strictEqual(h2Block.headingLevel, 2);
    assert.strictEqual(h2Block.words[0].inlineFormatting?.cleanDisplay, 'Methods');

    // H3
    const h3Words = ['###', 'Detailed', 'Analysis'].map((w, idx) => ({
      word: makeWord(w, idx + 20),
      globalIndex: idx + 20,
    }));
    const h3Block = classifyFlowBlock(h3Words);
    assert.strictEqual(h3Block.type, 'h3');
    assert.strictEqual(h3Block.headingLevel, 3);
  });

  it('2. Maps DocumentStructure sections to headings even without raw markdown hashes', () => {
    const docStructure: DocumentStructure = {
      documentId: 'doc-1',
      chapters: [
        {
          id: 'chap-1',
          title: 'The Dopamine Engine',
          level: 1,
          startWordIndex: 0,
          endWordIndex: 50,
        },
      ],
      sections: [
        {
          id: 'chap-1',
          title: 'The Dopamine Engine',
          level: 1,
          startWordIndex: 0,
          endWordIndex: 50,
        },
        {
          id: 'sec-2',
          title: 'Saccadic Suppression',
          level: 2,
          startWordIndex: 51,
          endWordIndex: 100,
        },
      ],
      createdAt: Date.now(),
    };

    const chapterWords = ['The', 'Dopamine', 'Engine'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const block = classifyFlowBlock(chapterWords, docStructure);
    assert.strictEqual(block.type, 'h1');
    assert.strictEqual(block.headingLevel, 1);

    const sectionWords = ['Saccadic', 'Suppression'].map((w, idx) => ({
      word: makeWord(w, idx + 51),
      globalIndex: idx + 51,
    }));
    const secBlock = classifyFlowBlock(sectionWords, docStructure);
    assert.strictEqual(secBlock.type, 'h2');
    assert.strictEqual(secBlock.headingLevel, 2);
  });

  it('3. Classifies Blockquotes and strips leading angle brackets cleanly', () => {
    const quoteWords = ['>', 'Reading', 'is', 'to', 'the', 'mind', 'what', 'exercise', 'is', 'to', 'the', 'body.'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const block = classifyFlowBlock(quoteWords);
    assert.strictEqual(block.type, 'blockquote');
    assert.strictEqual(block.words[0].isPrefixToken, true);

    // Attached quote mark: '>Reading'
    const attachedWords = ['>Reading', 'elevates', 'focus.'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const attachedBlock = classifyFlowBlock(attachedWords);
    assert.strictEqual(attachedBlock.type, 'blockquote');
    assert.strictEqual(attachedBlock.words[0].inlineFormatting?.cleanDisplay, 'Reading');
  });

  it('4. Classifies Callouts (Note, Tip, Warning, Important) accurately', () => {
    const noteWords = ['>', '[!NOTE]', 'Remember', 'to', 'hydrate.'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const noteBlock = classifyFlowBlock(noteWords);
    assert.strictEqual(noteBlock.type, 'callout');
    assert.strictEqual(noteBlock.calloutType, 'note');

    const tipWords = ['[!TIP]', 'Use', 'bionic', 'prefix', 'mode.'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const tipBlock = classifyFlowBlock(tipWords);
    assert.strictEqual(tipBlock.type, 'callout');
    assert.strictEqual(tipBlock.calloutType, 'tip');

    const warnWords = ['[!WARNING]', 'Avoid', 'rapid', 'speed', 'spikes.'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const warnBlock = classifyFlowBlock(warnWords);
    assert.strictEqual(warnBlock.type, 'callout');
    assert.strictEqual(warnBlock.calloutType, 'warning');
  });

  it('5. Classifies Fenced Code Blocks with language identification', () => {
    const codeWords = ['```typescript', 'const', 'wpm', '=', '350;', '```'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const block = classifyFlowBlock(codeWords);
    assert.strictEqual(block.type, 'codeblock');
    assert.strictEqual(block.codeLanguage, 'typescript');
    assert.strictEqual(block.words[0].isPrefixToken, true);
    assert.strictEqual(block.words[block.words.length - 1].isPrefixToken, true);
  });

  it('6. Classifies Unordered and Ordered Lists', () => {
    // Bullet list
    const bulletWords = ['•', 'Rapid', 'Serial', 'Visual', 'Presentation'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const bulletBlock = classifyFlowBlock(bulletWords);
    assert.strictEqual(bulletBlock.type, 'bullet-list');
    assert.strictEqual(bulletBlock.listMarker, '•');

    // Dash bullet list
    const dashWords = ['-', 'Continuous', 'reading', 'flow'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const dashBlock = classifyFlowBlock(dashWords);
    assert.strictEqual(dashBlock.type, 'bullet-list');

    // Numbered list
    const orderedWords = ['1.', 'First', 'step', 'is', 'setup'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const orderedBlock = classifyFlowBlock(orderedWords);
    assert.strictEqual(orderedBlock.type, 'ordered-list');
    assert.strictEqual(orderedBlock.listMarker, '1.');
  });

  it('7. Classifies Horizontal Rules', () => {
    const hrWords = ['---'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const hrBlock = classifyFlowBlock(hrWords);
    assert.strictEqual(hrBlock.type, 'horizontal-rule');
    assert.strictEqual(hrBlock.isDivider, true);
  });

  it('8. Correctly parses inline markdown (bold, italic, code, strikethrough)', () => {
    // Inline code
    const codeWord = makeWord('`calculateWpm()`', 0);
    const codeMeta = parseInlineMarkdown(codeWord);
    assert.strictEqual(codeMeta.isInlineCode, true);
    assert.strictEqual(codeMeta.cleanDisplay, 'calculateWpm()');
    assert.ok(codeMeta.cleanWordParts);

    // Bold
    const boldWord = makeWord('**attention**', 1);
    const boldMeta = parseInlineMarkdown(boldWord);
    assert.strictEqual(boldMeta.isBold, true);
    assert.strictEqual(boldMeta.cleanDisplay, 'attention');
    assert.ok(boldMeta.cleanWordParts);

    // Italic
    const italicWord = makeWord('*saccades*', 2);
    const italicMeta = parseInlineMarkdown(italicWord);
    assert.strictEqual(italicMeta.isItalic, true);
    assert.strictEqual(italicMeta.cleanDisplay, 'saccades');

    // Strikethrough
    const strikeWord = makeWord('~~distraction~~', 3);
    const strikeMeta = parseInlineMarkdown(strikeWord);
    assert.strictEqual(strikeMeta.isStrikethrough, true);
    assert.strictEqual(strikeMeta.cleanDisplay, 'distraction');
  });

  it('9. Recognizes RTL and LTR text direction across Markdown blocks', () => {
    // Persian H1 heading in Markdown
    const farsiHeadingWords = ['#', 'راهنمای', 'جامع', 'تمرکز'].map((w, idx) => ({
      word: { ...makeWord(w, idx), isRtl: idx > 0 },
      globalIndex: idx,
    }));
    const farsiH1Block = classifyFlowBlock(farsiHeadingWords);
    assert.strictEqual(farsiH1Block.type, 'h1');
    assert.strictEqual(farsiH1Block.isRtl, true);
    assert.strictEqual(farsiH1Block.direction, 'rtl');

    // English H2 heading
    const englishH2Words = ['##', 'Cognitive', 'Load', 'Theory'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const englishH2Block = classifyFlowBlock(englishH2Words);
    assert.strictEqual(englishH2Block.type, 'h2');
    assert.strictEqual(englishH2Block.isRtl, false);
    assert.strictEqual(englishH2Block.direction, 'ltr');

    // Persian paragraph
    const farsiParaWords = ['خواندن', 'سریع', 'با', 'روش', 'RSVP', 'بهبود', 'می‌یابد.'].map((w, idx) => ({
      word: { ...makeWord(w, idx), isRtl: w !== 'RSVP' },
      globalIndex: idx,
    }));
    const farsiParaBlock = classifyFlowBlock(farsiParaWords);
    assert.strictEqual(farsiParaBlock.type, 'paragraph');
    assert.strictEqual(farsiParaBlock.isRtl, true);
    assert.strictEqual(farsiParaBlock.direction, 'rtl');

    // Fenced Code Block (must ALWAYS be LTR even with Persian text around it)
    const codeWords = ['```python', 'print("سلام")', '```'].map((w, idx) => ({
      word: makeWord(w, idx),
      globalIndex: idx,
    }));
    const codeBlock = classifyFlowBlock(codeWords);
    assert.strictEqual(codeBlock.type, 'codeblock');
    assert.strictEqual(codeBlock.isRtl, false);
    assert.strictEqual(codeBlock.direction, 'ltr');
  });

  it('10. Correctly recognizes RTL on Markdown formatted tokens in splitWordParts', () => {
    // Bold Persian token with ** markers
    const boldFarsi = splitWordParts('**تمرکز**', 'middle-two', 0);
    assert.strictEqual(boldFarsi.isRtl, true, 'Recognizes **تمرکز** as RTL');

    // Italic Persian token with * markers
    const italicFarsi = splitWordParts('*خواندن*', 'middle-two', 1);
    assert.strictEqual(italicFarsi.isRtl, true, 'Recognizes *خواندن* as RTL');

    // Inline code Persian token with backticks
    const codeFarsi = splitWordParts('`کد_آزمایشی`', 'middle-two', 2);
    assert.strictEqual(codeFarsi.isRtl, true, 'Recognizes `کد_آزمایشی` as RTL');

    // Attached heading hash #تیتر
    const headingFarsi = splitWordParts('#تیتر', 'middle-two', 3);
    assert.strictEqual(headingFarsi.isRtl, true, 'Recognizes #تیتر as RTL');

    // Persian with quote marker >نقل
    const quoteFarsi = splitWordParts('>جمله', 'middle-two', 4);
    assert.strictEqual(quoteFarsi.isRtl, true, 'Recognizes >جمله as RTL');

    // English bold remains LTR
    const boldEnglish = splitWordParts('**focus**', 'middle-two', 5);
    assert.strictEqual(boldEnglish.isRtl, false, 'Recognizes **focus** as LTR');
  });
});
