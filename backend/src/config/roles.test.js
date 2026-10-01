const test = require('node:test');
const assert = require('node:assert/strict');
const { roleMatches, getLandingForRole } = require('./roles');

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

test('every role resolves to a valid server-side landing', () => {
  const landings = ['dashboard', 'parent_portal'];
  for (const role of ['super-admin', 'admin', 'headteacher', 'director-of-studies', 'hod', 'teacher', 'class-teacher', 'student', 'parent', 'bursar', 'supervisor', 'deputy-head', 'registrar', 'academic-admin', 'inventory-manager']) {
    assert.ok(landings.includes(getLandingForRole(role)), `${role} should map to a known landing`);
  }
});

test('parents land on the parent portal, curriculum staff on the dashboard', () => {
  assert.equal(getLandingForRole('parent'), 'parent_portal');
  assert.equal(getLandingForRole('teacher'), 'dashboard');
  assert.equal(getLandingForRole('hod'), 'dashboard');
  assert.equal(getLandingForRole('director-of-studies'), 'dashboard');
  assert.equal(getLandingForRole('headteacher'), 'dashboard');
});

test('unknown roles fall back to the default dashboard', () => {
  assert.equal(getLandingForRole('some-unknown-role'), 'dashboard');
  assert.equal(getLandingForRole(undefined), 'dashboard');
});
