const test = require('node:test');
const assert = require('node:assert/strict');
const { timeToMinutes, hasTimeOverlap } = require('./scheduleConflicts');

test('timeToMinutes accepts valid 24-hour times only', () => {
  assert.equal(timeToMinutes('08:30'), 510);
  assert.equal(timeToMinutes('23:59'), 1439);
  assert.equal(timeToMinutes('24:00'), null);
  assert.equal(timeToMinutes('8:30'), null);
});

test('schedule overlap detects partial and contained overlaps but permits back-to-back lessons', () => {
  assert.equal(hasTimeOverlap('08:00', '09:00', '08:45', '09:30'), true);
  assert.equal(hasTimeOverlap('08:00', '10:00', '08:30', '09:00'), true);
  assert.equal(hasTimeOverlap('08:00', '09:00', '09:00', '10:00'), false);
});
