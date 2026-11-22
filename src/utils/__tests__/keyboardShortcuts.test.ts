import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveKeyboardShortcut,
  ShortcutContext,
  ShortcutKeyEventLike,
} from '../keyboardShortcuts';

const defaultCtx: ShortcutContext = {
  isAnyModalOpen: false,
  isShortcutsModalOpen: false,
  canUndoRestart: false,
};

function keyEvent(overrides: Partial<ShortcutKeyEventLike>): ShortcutKeyEventLike {
  return {
    key: '',
    code: '',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    targetTagName: 'BODY',
    isContentEditable: false,
    ...overrides,
  };
}

test('plain R and CapsLock R never restart the document', () => {
  assert.equal(
    resolveKeyboardShortcut(keyEvent({ key: 'r', code: 'KeyR' }), defaultCtx),
    null
  );
  assert.equal(
    resolveKeyboardShortcut(keyEvent({ key: 'R', code: 'KeyR', shiftKey: false }), defaultCtx),
    null
  );
});

test('Shift + R triggers restart (and ignores key repeat)', () => {
  assert.deepEqual(
    resolveKeyboardShortcut(keyEvent({ key: 'R', code: 'KeyR', shiftKey: true }), defaultCtx),
    { type: 'restart' }
  );
  assert.equal(
    resolveKeyboardShortcut(
      keyEvent({ key: 'R', code: 'KeyR', shiftKey: true, repeat: true }),
      defaultCtx
    ),
    null
  );
});

test('Ctrl/Cmd + Z undoes a recent restart only when an undo snapshot is available', () => {
  assert.equal(
    resolveKeyboardShortcut(
      keyEvent({ key: 'z', code: 'KeyZ', ctrlKey: true }),
      { ...defaultCtx, canUndoRestart: false }
    ),
    null
  );
  assert.deepEqual(
    resolveKeyboardShortcut(
      keyEvent({ key: 'z', code: 'KeyZ', ctrlKey: true }),
      { ...defaultCtx, canUndoRestart: true }
    ),
    { type: 'undo_restart' }
  );
  assert.deepEqual(
    resolveKeyboardShortcut(
      keyEvent({ key: 'z', code: 'KeyZ', metaKey: true }),
      { ...defaultCtx, canUndoRestart: true }
    ),
    { type: 'undo_restart' }
  );
});

test('browser modifier shortcuts (Ctrl/Cmd/Alt) never fall through to single-key reader shortcuts', () => {
  const blockedCombos: Array<Partial<ShortcutKeyEventLike>> = [
    { key: 'r', code: 'KeyR', ctrlKey: true },
    { key: 'r', code: 'KeyR', metaKey: true },
    { key: 'R', code: 'KeyR', metaKey: true, shiftKey: true },
    { key: 'f', code: 'KeyF', ctrlKey: true },
    { key: 'f', code: 'KeyF', metaKey: true },
    { key: 's', code: 'KeyS', ctrlKey: true },
    { key: 't', code: 'KeyT', metaKey: true },
    { key: 'a', code: 'KeyA', ctrlKey: true },
    { key: 'd', code: 'KeyD', metaKey: true },
    { key: 'm', code: 'KeyM', metaKey: true },
    { key: 'ArrowLeft', code: 'ArrowLeft', altKey: true },
    { key: 'ArrowRight', code: 'ArrowRight', metaKey: true },
  ];

  for (const combo of blockedCombos) {
    assert.equal(
      resolveKeyboardShortcut(keyEvent(combo), defaultCtx),
      null,
      `Expected modifier combo ${JSON.stringify(combo)} to be ignored`
    );
  }

  // Explicit app modifier shortcuts still resolve
  assert.deepEqual(
    resolveKeyboardShortcut(keyEvent({ key: 'o', code: 'KeyO', metaKey: true }), defaultCtx),
    { type: 'open_input_hub' }
  );
  assert.deepEqual(
    resolveKeyboardShortcut(keyEvent({ key: 'v', code: 'KeyV', ctrlKey: true }), defaultCtx),
    { type: 'paste_clipboard' }
  );
});

test('shortcuts are ignored inside editable fields and during IME composition', () => {
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
    assert.equal(
      resolveKeyboardShortcut(keyEvent({ key: ' ', code: 'Space', targetTagName: tag }), defaultCtx),
      null
    );
    assert.equal(
      resolveKeyboardShortcut(
        keyEvent({ key: 'R', code: 'KeyR', shiftKey: true, targetTagName: tag }),
        defaultCtx
      ),
      null
    );
  }

  assert.equal(
    resolveKeyboardShortcut(keyEvent({ key: 'f', code: 'KeyF', isContentEditable: true }), defaultCtx),
    null
  );
  assert.equal(
    resolveKeyboardShortcut(keyEvent({ key: 'f', code: 'KeyF', isComposing: true }), defaultCtx),
    null
  );
});

test('single-key reader shortcuts do not fire while a modal or drawer is open', () => {
  const modalCtx: ShortcutContext = {
    isAnyModalOpen: true,
    isShortcutsModalOpen: false,
    canUndoRestart: true,
  };

  assert.equal(resolveKeyboardShortcut(keyEvent({ key: ' ', code: 'Space' }), modalCtx), null);
  assert.equal(
    resolveKeyboardShortcut(keyEvent({ key: 'R', code: 'KeyR', shiftKey: true }), modalCtx),
    null
  );
  assert.equal(resolveKeyboardShortcut(keyEvent({ key: 'f', code: 'KeyF' }), modalCtx), null);
  assert.equal(resolveKeyboardShortcut(keyEvent({ key: 'm', code: 'KeyM' }), modalCtx), null);

  // Escape always closes modals
  assert.deepEqual(
    resolveKeyboardShortcut(keyEvent({ key: 'Escape', code: 'Escape' }), modalCtx),
    { type: 'close_modals' }
  );

  // '?' toggles shortcuts modal closed when shortcuts modal is open
  assert.deepEqual(
    resolveKeyboardShortcut(keyEvent({ key: '?', code: 'Slash', shiftKey: true }), {
      ...modalCtx,
      isShortcutsModalOpen: true,
    }),
    { type: 'toggle_shortcuts' }
  );
});
