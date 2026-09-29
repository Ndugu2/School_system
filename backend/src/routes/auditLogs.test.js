const test = require('node:test');
const assert = require('node:assert/strict');
const { mock, before, after } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const auditLogRoutes = require('./auditLogs');

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
    app.use('/audit-logs', auditLogRoutes);
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

const withUser = (role) => {
  const userLookup = mock.method(User, 'findById', () => ({ select: async () => ({ _id: 'u-1', name: 'Academic Leader', role, isActive: true }) }));
  return () => userLookup.mock.restore();
};

const mockLogQuery = () => {
  const logs = [{ _id: 'log-1', action: 'academic-permission.granted', module: 'academic-permissions' }];
  const count = mock.method(AuditLog, 'countDocuments', async () => logs.length);
  const find = mock.method(AuditLog, 'find', (query) => {
    assert.deepEqual(query.module, { $in: ['academic-permissions', 'results', 'teachers', 'subjects'] });
    return {
      populate: () => ({ sort: () => ({ skip: () => ({ limit: async () => logs }) }) }),
    };
  });
  return () => { count.mock.restore(); find.mock.restore(); };
};

test('a Director of Studies can query only the academic audit trail', withServer(async (base) => {
  const restore = withUser('director-of-studies');
  const restoreLogs = mockLogQuery();
  try {
    const res = await fetch(`${base}/audit-logs`, { headers: { ...auth } });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total, 1);
    assert.equal(data.logs[0].module, 'academic-permissions');
  } finally { restore(); restoreLogs(); }
}));

test('a Director of Studies cannot read finance audit logs', withServer(async (base) => {
  const restore = withUser('director-of-studies');
  const count = mock.method(AuditLog, 'countDocuments', async (query) => {
    assert.deepEqual(query.module, { $in: ['academic-permissions', 'results', 'teachers', 'subjects'] });
    return 0;
  });
  const find = mock.method(AuditLog, 'find', () => ({ populate: () => ({ sort: () => ({ skip: () => ({ limit: async () => [] }) }) }) }));
  try {
    const res = await fetch(`${base}/audit-logs?module=finance`, { headers: { ...auth } });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).logs, []);
  } finally { restore(); count.mock.restore(); find.mock.restore(); }
}));

test('a plain teacher is denied the audit log endpoint', withServer(async (base) => {
  const restore = withUser('teacher');
  try {
    const res = await fetch(`${base}/audit-logs`, { headers: { ...auth } });
    assert.equal(res.status, 403);
  } finally { restore(); }
}));