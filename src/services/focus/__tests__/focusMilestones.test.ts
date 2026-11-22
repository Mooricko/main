import assert from 'node:assert';
import test from 'node:test';
import { 
  recordFocusBlockCompleted, 
  getFocusMilestonesData, 
  saveFocusMilestonesData,
  getAllMilestonesProgress, 
  getNextUpcomingMilestone,
  FOCUS_MILESTONES_STORAGE_KEY 
} from '../focusMilestoneService';
import { safeStorage } from '../../../utils/safeStorage';

test('Focus Milestones and Predefined Session Tracking', async (t) => {
  // Clear any existing stored data before testing
  safeStorage.removeItem(FOCUS_MILESTONES_STORAGE_KEY);

  await t.test('1. Initial state has 0 blocks and empty unlocked milestones', () => {
    const initial = getFocusMilestonesData();
    assert.strictEqual(initial.completedBlocksCount, 0);
    assert.strictEqual(initial.totalFocusMinutes, 0);
    assert.strictEqual(initial.unlockedMilestoneIds.length, 0);
  });

  await t.test('2. Completing first focus block unlocks First Spark', () => {
    const result = recordFocusBlockCompleted({
      durationMinutes: 15,
      presetLabel: '15m Standard Focus',
      wordsRead: 450,
      avgWpm: 300,
    });

    assert.strictEqual(result.data.completedBlocksCount, 1);
    assert.strictEqual(result.data.totalFocusMinutes, 15);
    assert.strictEqual(result.data.todayBlocksCount, 1);
    assert.strictEqual(result.data.currentStreakDays, 1);

    // Newly unlocked should contain first_spark
    const spark = result.newlyUnlocked.find((m) => m.id === 'first_spark');
    assert.ok(spark, 'First Spark milestone must be unlocked on 1st block');
    assert.strictEqual(spark?.title, 'First Spark');

    // Also words read >= 350 unlocks Speed Demon / Word Dynamo
    const dynamo = result.newlyUnlocked.find((m) => m.id === 'speed_demon_block');
    assert.ok(dynamo, 'Word Dynamo milestone unlocked for reading 450 words in block');
  });

  await t.test('3. Completing second block unlocks Dual Focus', () => {
    const result = recordFocusBlockCompleted({
      durationMinutes: 10,
      presetLabel: '10m Focus Block',
      wordsRead: 200,
      avgWpm: 250,
    });

    assert.strictEqual(result.data.completedBlocksCount, 2);
    assert.strictEqual(result.data.totalFocusMinutes, 25);
    assert.strictEqual(result.data.todayBlocksCount, 2);

    const dual = result.newlyUnlocked.find((m) => m.id === 'dual_focus');
    assert.ok(dual, 'Dual Focus must be unlocked on 2nd block');

    // First Spark should NOT be in newlyUnlocked again
    const sparkAgain = result.newlyUnlocked.find((m) => m.id === 'first_spark');
    assert.strictEqual(sparkAgain, undefined, 'First Spark should not be re-announced');
  });

  await t.test('4. Completing up to 5 blocks unlocks Flow Trio and Pomodoro Pioneer', () => {
    // 3rd block
    const r3 = recordFocusBlockCompleted({ durationMinutes: 15, wordsRead: 200, avgWpm: 200 });
    assert.ok(r3.newlyUnlocked.some((m) => m.id === 'flow_trio'));

    // 4th block
    recordFocusBlockCompleted({ durationMinutes: 15, wordsRead: 200, avgWpm: 200 });

    // 5th block
    const r5 = recordFocusBlockCompleted({ durationMinutes: 15, wordsRead: 200, avgWpm: 200 });
    assert.ok(r5.newlyUnlocked.some((m) => m.id === 'pomodoro_pioneer'));
    assert.strictEqual(r5.data.completedBlocksCount, 5);
  });

  await t.test('5. getNextUpcomingMilestone computes correct next target', () => {
    const data = getFocusMilestonesData();
    const next = getNextUpcomingMilestone(data);
    assert.ok(next !== null);
    assert.ok(next.remaining > 0);
    assert.ok(next.progressPercent >= 0 && next.progressPercent <= 100);
  });

  await t.test('6. Progress percentage calculations are bounded', () => {
    const data = getFocusMilestonesData();
    const all = getAllMilestonesProgress(data);
    assert.strictEqual(all.length, 13);
    for (const item of all) {
      assert.ok(item.progressPercent >= 0 && item.progressPercent <= 100);
      if (item.isUnlocked) {
        assert.strictEqual(item.progressPercent, 100);
      }
    }
  });

  // Clean up
  safeStorage.removeItem(FOCUS_MILESTONES_STORAGE_KEY);
});
