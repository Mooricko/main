import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNextTabTarget,
  getActiveDialogStackSize,
  isTopmostDialog,
  pushActiveDialog,
  removeActiveDialog,
  resolveReturnFocusTarget,
} from '../useDialogFocusTrap';

test('computeNextTabTarget wraps forward from last element to first and backward from first to last', () => {
  const container = { name: 'dialog' };
  const first = { name: 'first' };
  const middle = { name: 'middle' };
  const last = { name: 'last' };
  const focusables = [first, middle, last];

  // Tab on last wraps to first
  assert.equal(computeNextTabTarget(focusables, last, false, container, true), first);

  // Shift+Tab on first wraps to last
  assert.equal(computeNextTabTarget(focusables, first, true, container, true), last);

  // Shift+Tab on dialog container itself wraps to last
  assert.equal(computeNextTabTarget(focusables, container, true, container, true), last);

  // Tab / Shift+Tab on middle lets browser move natively
  assert.equal(computeNextTabTarget(focusables, middle, false, container, true), null);
  assert.equal(computeNextTabTarget(focusables, middle, true, container, true), null);
  assert.equal(computeNextTabTarget(focusables, first, false, container, true), null);
  assert.equal(computeNextTabTarget(focusables, last, true, container, true), null);

  // Focus outside dialog is pulled back inside
  const outside = { name: 'outside' };
  assert.equal(computeNextTabTarget(focusables, outside, false, container, false), first);
  assert.equal(computeNextTabTarget(focusables, outside, true, container, false), last);

  // Dialog with zero focusable children keeps focus on container
  assert.equal(computeNextTabTarget([], container, false, container, true), container);
  assert.equal(computeNextTabTarget([], container, true, container, true), container);
});

test('active dialog stack tracks topmost nested dialog accurately', () => {
  const drawer = { id: 'settings-drawer' } as unknown as HTMLElement;
  const modal = { id: 'focus-timer-modal' } as unknown as HTMLElement;

  assert.equal(getActiveDialogStackSize(), 0);
  pushActiveDialog(drawer);
  assert.equal(isTopmostDialog(drawer), true);
  assert.equal(isTopmostDialog(modal), false);

  pushActiveDialog(modal);
  assert.equal(getActiveDialogStackSize(), 2);
  assert.equal(isTopmostDialog(drawer), false);
  assert.equal(isTopmostDialog(modal), true);

  removeActiveDialog(modal);
  assert.equal(getActiveDialogStackSize(), 1);
  assert.equal(isTopmostDialog(drawer), true);

  removeActiveDialog(drawer);
  assert.equal(getActiveDialogStackSize(), 0);
});

test('resolveReturnFocusTarget restores connected element or falls back to remounted element by ID', () => {
  const connectedTrigger = {
    isConnected: true,
    hasAttribute: () => false,
  } as unknown as HTMLElement;

  assert.equal(
    resolveReturnFocusTarget(connectedTrigger, 'open-settings-btn', {
      getElementById: () => null,
    }),
    connectedTrigger
  );

  // Disconnected trigger (e.g., collapsed sidebar toggle button that unmounts while sidebar is open)
  const disconnectedTrigger = {
    isConnected: false,
    hasAttribute: () => false,
  } as unknown as HTMLElement;
  const remountedTrigger = {
    isConnected: true,
    hasAttribute: () => false,
  } as unknown as HTMLElement;

  assert.equal(
    resolveReturnFocusTarget(disconnectedTrigger, 'sidebar-toggle-btn', {
      getElementById: (id) => (id === 'sidebar-toggle-btn' ? remountedTrigger : null),
    }),
    remountedTrigger
  );

  // Disabled element is skipped
  const disabledTrigger = {
    isConnected: true,
    hasAttribute: (name: string) => name === 'disabled',
  } as unknown as HTMLElement;
  assert.equal(
    resolveReturnFocusTarget(disabledTrigger, null, {
      getElementById: () => null,
    }),
    null
  );
});
