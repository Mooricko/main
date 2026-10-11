import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatHistoryDate } from '../DocumentSidebar';

describe('formatHistoryDate', () => {
  it('formats dates in "yyyy-mm-dd  hh:mm AM/PM" format correctly', () => {
    // 2026-10-11 at 9:05 AM local time
    const date1 = new Date(2026, 9, 11, 9, 5); // month is 0-indexed: 9 = October
    const formatted1 = formatHistoryDate(date1);
    assert.strictEqual(formatted1, '2026-10-11  09:05 AM');

    // 2026-03-04 at 2:30 PM local time
    const date2 = new Date(2026, 2, 4, 14, 30); // 2 = March
    const formatted2 = formatHistoryDate(date2);
    assert.strictEqual(formatted2, '2026-03-04  02:30 PM');

    // Midnight: 12:00 AM
    const dateMidnight = new Date(2026, 0, 1, 0, 0); // Jan 1st
    const formattedMidnight = formatHistoryDate(dateMidnight);
    assert.strictEqual(formattedMidnight, '2026-01-01  12:00 AM');

    // Noon: 12:00 PM
    const dateNoon = new Date(2026, 5, 15, 12, 0); // June 15th
    const formattedNoon = formatHistoryDate(dateNoon);
    assert.strictEqual(formattedNoon, '2026-06-15  12:00 PM');
  });

  it('handles empty and invalid input safely', () => {
    assert.strictEqual(formatHistoryDate(undefined), '');
    assert.strictEqual(formatHistoryDate(''), '');
    assert.strictEqual(formatHistoryDate('invalid-date'), 'invalid-date');
  });
});
