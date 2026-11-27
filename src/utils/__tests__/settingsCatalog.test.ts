import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SETTINGS_TABS,
  SETTINGS_CATALOG,
  filterSettingsCatalog,
} from '../settingsCatalog';

test('settings catalog covers all 4 tabs with unique setting IDs', () => {
  const tabIds = SETTINGS_TABS.map((t) => t.id);
  assert.deepEqual(tabIds, ['appearance', 'focus', 'pacing', 'audio']);

  const seenIds = new Set<string>();
  for (const item of SETTINGS_CATALOG) {
    assert.ok(tabIds.includes(item.tab), `Unexpected tab ${item.tab}`);
    assert.ok(!seenIds.has(item.id), `Duplicate setting ID ${item.id}`);
    seenIds.add(item.id);
  }

  for (const tab of SETTINGS_TABS) {
    const count = SETTINGS_CATALOG.filter((item) => item.tab === tab.id).length;
    assert.ok(count > 0, `Tab ${tab.id} should contain at least one setting`);
  }
});

test('empty or whitespace query disables search mode and includes all settings', () => {
  const res = filterSettingsCatalog('   ');
  assert.equal(res.isSearching, false);
  assert.equal(res.totalMatches, SETTINGS_CATALOG.length);
  assert.equal(res.groupedMatches.length, 4);
});

test('cross-category search finds matching settings across multiple tabs', () => {
  const res = filterSettingsCatalog('focus');
  assert.equal(res.isSearching, true);
  assert.ok(res.totalMatches >= 3);
  const matchedTabIds = res.groupedMatches.map((g) => g.tab.id);
  assert.ok(matchedTabIds.includes('focus'));
  assert.ok(matchedTabIds.includes('pacing'));
  assert.ok(matchedTabIds.includes('audio'));
});

test('synonym, acronym, multi-word, and Farsi queries match expected settings', () => {
  const orp = filterSettingsCatalog('ORP');
  assert.ok(orp.matchedIds.has('optical-center'));

  const piper = filterSettingsCatalog('piper');
  assert.ok(piper.matchedIds.has('voice-narration'));
  assert.equal(piper.totalMatches, 1);

  const farsi = filterSettingsCatalog('فارسی');
  assert.ok(farsi.matchedIds.has('font-family'));
  assert.ok(farsi.matchedIds.has('voice-narration'));

  const multiToken = filterSettingsCatalog('word size');
  assert.ok(multiToken.matchedIds.has('rsvp-font-size'));
  assert.ok(multiToken.matchedIds.has('flow-font-size'));

  const dnd = filterSettingsCatalog('dnd');
  assert.ok(dnd.matchedIds.has('do-not-disturb'));
});

test('unmatched query returns zero results cleanly', () => {
  const res = filterSettingsCatalog('xyznonexistentsetting123');
  assert.equal(res.isSearching, true);
  assert.equal(res.totalMatches, 0);
  assert.equal(res.groupedMatches.length, 0);
});
