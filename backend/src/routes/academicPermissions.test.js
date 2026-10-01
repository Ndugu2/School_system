const test = require('node:test');
const assert = require('node:assert/strict');
const { mock, before, after } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const AcademicPermission = require('../models/AcademicPermission');
const AuditLog = require('../models/AuditLog');
const academicPermissionRoutes = require('./academicPermissions');

before(() => {
  mock.method(jwt, 'verify', () => ({ id: 'dos-1' }));
});

after(() => {
  mock.restoreAll();
});

const startApp = () =>
  new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    app.use('/academic-permissions', academicPermissionRoutes);
    const server = app.listen(0, '127.0.0.1', () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });

const withServer = (fn) => async () => {
  const { server, base } = await startApp();
  try {
    await fn(base);
  } finally {
    server.close();
  }
};

const auth = { authorization: 'Bearer mock-token' };

const dos = { _id: 'dos-1', name: 'DOS User', role: 'director-of-studies', isActive: true };
const teacherUser = { _id: 'teacher-1', name: 'Tr. Teacher', role: 'teacher', isActive: true };
const teacherProfile = { _id: 'tp-1', user: 'teacher-1', subjects: ['subject-1'], classes: ['class-1'] };
const subjectDoc = { _id: 'subject-1', name: 'Mathematics', code: 'MATH' };
const classDoc = { _id: 'class-1', name: 'S1 East' };
const permission = {
  _id: 'perm-1',
  teacher: 'teacher-1',
  subject: 'subject-1',
  class: 'class-1',
  academicYear: 2026,
  term: 'Term 1',
  assessmentTypes: ['BOT', 'MOT', 'EOT'],
  startsAt: new Date(),
  endsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  grantedBy: 'dos-1',
};

const mockAcademicDeps = () => {
  const findByIdUser = mock.method(User, 'findById', (id) => {
    if (String(id) === 'teacher-1') return { select: async () => teacherUser };
    return { select: async () => dos };
  });
  const findOneTeacher = mock.method(Teacher, 'findOne', () => ({ select: async () => teacherProfile }));
  const findByIdSubject = mock.method(Subject, 'findById', () => ({ select: async () => subjectDoc }));
  const findByIdClass = mock.method(Class, 'findById', () => ({ select: async () => classDoc }));
  const createPermission = mock.method(AcademicPermission, 'create', async (data) => ({ ...permission, ...data }));
  const findByIdPermission = mock.method(AcademicPermission, 'findById', async () => ({ ...permission, save: async function () {}, toObject: () => permission }));
  const findByIdAndUpdatePermission = mock.method(AcademicPermission, 'findByIdAndUpdate', async () => ({ ...permission, revokedAt: new Date() }));
  const findPermissions = mock.method(AcademicPermission, 'find', () => {
    const chain = {
      populate: () => chain,
      sort: async (by) => {
        assert.equal(by.endsAt, -1);
        return [];
      },
    };
    return chain;
  });
  const createLog = mock.method(AuditLog, 'create', async () => ({}));
  return {
    restore: () => {
      findByIdUser.mock.restore();
      findOneTeacher.mock.restore();
      findByIdSubject.mock.restore();
      findByIdClass.mock.restore();
      createPermission.mock.restore();
      findByIdPermission.mock.restore();
      findByIdAndUpdatePermission.mock.restore();
      findPermissions.mock.restore();
      createLog.mock.restore();
    },
    count: () => [findOneTeacher.mock.callCount(), createPermission.mock.callCount(), createLog.mock.callCount()],
  };
};

const dosRegister = () => {
  const userLookup = mock.method(User, 'findById', () => ({ select: async () => dos }));
  return () => userLookup.mock.restore();
};

test('DOS can grant marks-entry access to an assigned teacher, scoped to their subject/class', withServer(async (base) => {
  const restoreUser = dosRegister();
  const deps = mockAcademicDeps();
  try {
    const res = await fetch(`${base}/academic-permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ teacher: 'teacher-1', subject: 'subject-1', class: 'class-1', academicYear: 2026, term: 'Term 1', endsAt: '2026-12-31T00:00:00.000Z' }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.subject, 'subject-1');
    assert.equal(deps.count()[1], 1); // permission created
    assert.ok(deps.count()[2] >= 1); // audit written
  } finally { restoreUser(); deps.restore(); }
}));

test('DOS cannot grant marks-entry access for a subject the teacher is not assigned to', withServer(async (base) => {
  const restoreUser = dosRegister();
  const deps = mockAcademicDeps();
  try {
    const res = await fetch(`${base}/academic-permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ teacher: 'teacher-1', subject: 'subject-999', class: 'class-1', academicYear: 2026, term: 'Term 1', endsAt: '2026-12-31T00:00:00.000Z' }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error.message, /not assigned to this subject/i);
    assert.equal(deps.count()[1], 0); // no permission created
  } finally { restoreUser(); deps.restore(); }
}));

test('DOS cannot grant to a non-teacher user', withServer(async (base) => {
  const userLookup = mock.method(User, 'findById', (id) => {
    if (String(id) === 'dos-1') return { select: async () => dos };
    return { select: async () => ({ _id: 'stud-1', role: 'student', isActive: true }) };
  });
  try {
    const res = await fetch(`${base}/academic-permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ teacher: 'stud-1', subject: 'subject-1', class: 'class-1', academicYear: 2026, term: 'Term 1', endsAt: '2026-12-31T00:00:00.000Z' }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error.message, /only be granted to teachers/i);
  } finally { userLookup.mock.restore(); }
}));

test('a teacher cannot grant marks-entry permissions (privilege roles only)', withServer(async (base) => {
  const userLookup = mock.method(User, 'findById', () => ({ select: async () => ({ _id: 'teacher-1', role: 'teacher' }) }));
  try {
    const res = await fetch(`${base}/academic-permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ teacher: 'teacher-1', subject: 'subject-1', class: 'class-1', academicYear: 2026, term: 'Term 1', endsAt: '2026-12-31T00:00:00.000Z' }),
    });
    assert.equal(res.status, 403);
  } finally { userLookup.mock.restore(); }
}));

test('DOS can revoke a granted permission and the change is audited', withServer(async (base) => {
  const restoreUser = dosRegister();
  const deps = mockAcademicDeps();
  try {
    const res = await fetch(`${base}/academic-permissions/perm-1/revoke`, {
      method: 'PATCH',
      headers: { ...auth },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.revokedAt);
    assert.ok(deps.count()[2] >= 1); // audit written
  } finally { restoreUser(); deps.restore(); }
}));

test('DOS can reopen or extend a marks-entry window via PATCH without revoking', withServer(async (base) => {
  const restoreUser = dosRegister();
  const deps = mockAcademicDeps();
  try {
    const res = await fetch(`${base}/academic-permissions/perm-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ endsAt: '2027-03-01T00:00:00.000Z' }),
    });
    assert.equal(res.status, 200);
    assert.ok(deps.count()[2] >= 1); // audit written
  } finally { restoreUser(); deps.restore(); }
}));

test('teachers can list their own academic permissions', withServer(async (base) => {
  const userLookup = mock.method(User, 'findById', () => ({ select: async () => ({ _id: 'teacher-1', role: 'teacher', isActive: true }) }));
  const findPermissions = mock.method(AcademicPermission, 'find', (query) => {
    assert.equal(query.teacher, 'teacher-1');
    const chain = {
      populate: () => chain,
      sort: async () => [],
    };
    return chain;
  });
  try {
    const res = await fetch(`${base}/academic-permissions`, { headers: { ...auth } });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  } finally { userLookup.mock.restore(); findPermissions.mock.restore(); }
}));