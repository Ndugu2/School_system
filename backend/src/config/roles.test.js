const test = require('node:test');
const assert = require('node:assert/strict');
const { roleMatches } = require('./roles');

test('headteacher inherits admin access', () => {
  assert.equal(roleMatches('headteacher', ['admin']), true);
});

test('department leadership inherits academic-admin access', () => {
  assert.equal(roleMatches('hod', ['academic-admin']), true);
  assert.equal(roleMatches('director-of-studies', ['academic-admin']), true);
});

test('unrelated roles are denied access', () => {
  assert.equal(roleMatches('teacher', ['finance-manager']), false);
  assert.equal(roleMatches('parent', ['admin']), false);
});

test('direct role matches remain allowed', () => {
  assert.equal(roleMatches('admin', ['admin', 'super-admin']), true);
  assert.equal(roleMatches('student', ['student']), true);
});
