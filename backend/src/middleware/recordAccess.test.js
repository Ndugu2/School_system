const test = require('node:test');
const assert = require('node:assert/strict');
const { hasAssignedClass } = require('./recordAccess');

test('teacher can access an assigned class across ObjectId and string values', () => {
  const classId = { toString: () => 'class-1' };
  assert.equal(hasAssignedClass(['class-1'], classId), true);
});

test('teacher cannot access an unassigned or missing class', () => {
  assert.equal(hasAssignedClass(['class-1'], 'class-2'), false);
  assert.equal(hasAssignedClass([], 'class-1'), false);
});
