import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, canAccessTab, roleHome, ROLE_HOME, DEFAULT_HOME } from './permissions.js';

test('roleHome lands parents on the parent portal and staff on the dashboard', () => {
  assert.equal(roleHome(ROLES.PARENT), 'parent_portal');
  for (const role of [ROLES.ADMIN, ROLES.HEADTEACHER, ROLES.HOD, ROLES.DIRECTOR_OF_STUDIES, ROLES.TEACHER, ROLES.CLASS_TEACHER, ROLES.STUDENT, ROLES.BURSAR, ROLES.SUPERVISOR]) {
    assert.equal(roleHome(role), 'dashboard', role);
  }
});

test('roleHome falls back to the default dashboard for unknown roles', () => {
  assert.equal(roleHome('unknown-role'), DEFAULT_HOME);
  assert.equal(roleHome(undefined), DEFAULT_HOME);
});

test('every defined role resolves to a home landing', () => {
  for (const role of Object.values(ROLES)) {
    assert.ok([DEFAULT_HOME, 'parent_portal'].includes(roleHome(role)), role);
  }
});

test('TAB_ACCESS mirrors ROLE_HOME so every role can reach its own landing', () => {
  for (const role of Object.values(ROLES)) {
    const home = roleHome(role);
    assert.equal(canAccessTab(role, home), true, `${role} should access ${home}`);
  }
});

test('teacher sees curriculum tabs but not finance/settings', () => {
  assert.equal(canAccessTab(ROLES.TEACHER, 'dashboard'), true);
  assert.equal(canAccessTab(ROLES.TEACHER, 'classes'), true);
  assert.equal(canAccessTab(ROLES.TEACHER, 'admissions'), false);
  assert.equal(canAccessTab(ROLES.TEACHER, 'finance'), false);
  assert.equal(canAccessTab(ROLES.TEACHER, 'settings'), false);
  assert.equal(canAccessTab(ROLES.TEACHER, 'hr'), false);
});

test('HOD and director of studies inherit academic leadership access', () => {
  assert.equal(canAccessTab(ROLES.HOD, 'analytics'), true);
  assert.equal(canAccessTab(ROLES.DIRECTOR_OF_STUDIES, 'analytics'), true);
  assert.equal(canAccessTab(ROLES.HOD, 'reports'), true);
  assert.equal(canAccessTab(ROLES.DIRECTOR_OF_STUDIES, 'reports'), true);
  assert.equal(canAccessTab(ROLES.HOD, 'finance'), false);
});

test('parents are limited to portals, grades and their own dashboard view', () => {
  assert.equal(canAccessTab(ROLES.PARENT, 'parent_portal'), true);
  assert.equal(canAccessTab(ROLES.PARENT, 'grades'), true);
  assert.equal(canAccessTab(ROLES.PARENT, 'reports'), true);
  assert.equal(canAccessTab(ROLES.PARENT, 'admissions'), false);
  assert.equal(canAccessTab(ROLES.PARENT, 'hr'), false);
});

test('students cannot reach admin-only areas', () => {
  assert.equal(canAccessTab(ROLES.STUDENT, 'dashboard'), true);
  assert.equal(canAccessTab(ROLES.STUDENT, 'settings'), false);
  assert.equal(canAccessTab(ROLES.STUDENT, 'admissions'), false);
  assert.equal(canAccessTab(ROLES.STUDENT, 'hr'), false);
});

test('admin and super-admin can access administrative areas', () => {
  assert.equal(canAccessTab(ROLES.ADMIN, 'hr'), true);
  assert.equal(canAccessTab(ROLES.ADMIN, 'settings'), true);
  assert.equal(canAccessTab(ROLES.SUPER_ADMIN, 'settings'), true);
  assert.equal(canAccessTab(ROLES.ADMIN, 'finance'), true);
});

test('unknown tabs deny every role', () => {
  assert.equal(canAccessTab(ROLES.ADMIN, 'does-not-exist'), false);
  assert.equal(canAccessTab(ROLES.HEADTEACHER, 'does-not-exist'), false);
});