const test = require('node:test');
const assert = require('node:assert/strict');
const { mock, before, after } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const AuditLog = require('../models/AuditLog');
const examResultRoutes = require('./examResults');

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
    app.use('/exam-results', examResultRoutes);
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

const withDos = () => {
  const userLookup = mock.method(User, 'findById', () => ({ select: async () => dos }));
  const findOneTeacher = mock.method(Teacher, 'findOne', () => ({ select: async () => null }));
  const findByIdStudent = mock.method(Student, 'findById', () => ({ select: async () => null }));
  return () => { userLookup.mock.restore(); findOneTeacher.mock.restore(); findByIdStudent.mock.restore(); };
};

const mockBulkOps = () => {
  const updateMany = mock.method(ExamResult, 'updateMany', async () => ({ modifiedCount: 4 }));
  const findLogs = mock.method(AuditLog, 'create', async () => ({}));
  return () => { updateMany.mock.restore(); findLogs.mock.restore(); };
};

test('a Director of Studies can approve submitted results', withServer(async (base) => {
  const restoreUser = withDos();
  const restoreOps = mockBulkOps();
  try {
    const res = await fetch(`${base}/exam-results/approve-hod`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ class: 'class-1', term: 'Term 1', academicYear: 2026 }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.message, /4 results approved/i);
  } finally { restoreUser(); restoreOps(); }
}));

test('a Director of Studies can return results for revision', withServer(async (base) => {
  const restoreUser = withDos();
  const restoreOps = mockBulkOps();
  try {
    const res = await fetch(`${base}/exam-results/return-revision`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ class: 'class-1', term: 'Term 1', academicYear: 2026 }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.message, /4 results returned/i);
  } finally { restoreUser(); restoreOps(); }
}));

test('a Director of Studies can publish approved results', withServer(async (base) => {
  const restoreUser = withDos();
  const restoreOps = mockBulkOps();
  try {
    const res = await fetch(`${base}/exam-results/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ class: 'class-1', term: 'Term 1', academicYear: 2026 }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.message, /4 results published/i);
  } finally { restoreUser(); restoreOps(); }
}));

test('a class teacher cannot approve results, only entry roles can', withServer(async (base) => {
  const userLookup = mock.method(User, 'findById', () => ({ select: async () => ({ _id: 't-1', role: 'class-teacher', isActive: true }) }));
  try {
    const res = await fetch(`${base}/exam-results/approve-hod`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ class: 'class-1', term: 'Term 1', academicYear: 2026 }),
    });
    assert.equal(res.status, 403);
  } finally { userLookup.mock.restore(); }
}));