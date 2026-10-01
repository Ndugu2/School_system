const test = require('node:test');
const assert = require('node:assert/strict');
const { mock, before, after } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authRoutes = require('./auth');

before(() => {
  mock.method(jwt, 'sign', () => 'mock-token');
  mock.method(jwt, 'verify', () => ({ id: 'user-1' }));
});

after(() => {
  mock.restoreAll();
});

const startApp = () =>
  new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    app.use(authRoutes);
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

const withUser = (mockUser) => {
  const findOne = mock.method(User, 'findOne', async () => mockUser);
  const find = mock.method(User, 'find', () => ({ sort: async () => [] }));
  const findById = mock.method(User, 'findById', () => ({ select: async () => mockUser }));
  return () => { findOne.mock.restore(); find.mock.restore(); findById.mock.restore(); };
};

const account = (overrides = {}) => ({
  _id: 'user-1',
  name: 'Tr. Kato Ronald',
  email: 'teacher@ndugu.ac.ug',
  role: 'teacher',
  avatar: null,
  isActive: true,
  comparePassword: async () => true,
  ...overrides,
});

test('login returns the role-aware landing for a valid teacher account', withServer(async (base) => {
  const restore = withUser(account());
  try {
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@ndugu.ac.ug', password: 'teacher123Demo!' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.role, 'teacher');
    assert.equal(data.landing, 'dashboard');
    assert.ok(data.token);
    assert.ok(data.refreshToken);
  } finally { restore(); }
}));

test('login rejects a deactivated account with 403', withServer(async (base) => {
  const restore = withUser(account({ isActive: false }));
  try {
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@ndugu.ac.ug', password: 'teacher123Demo!' }),
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error.message, /deactivated/i);
  } finally { restore(); }
}));

test('login rejects an invalid password with 401', withServer(async (base) => {
  const restore = withUser(account({ comparePassword: async () => false }));
  try {
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@ndugu.ac.ug', password: 'wrong-password' }),
    });
    assert.equal(res.status, 401);
  } finally { restore(); }
}));

test('login rejects missing credentials with 400', withServer(async (base) => {
  const restore = withUser(account());
  try {
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' }),
    });
    assert.equal(res.status, 400);
  } finally { restore(); }
}));

test('GET /me requires authentication', withServer(async (base) => {
  const restore = withUser(account());
  try {
    const res = await fetch(`${base}/me`);
    assert.equal(res.status, 401);
  } finally { restore(); }
}));

test('GET /me is blocked for a deactivated account', withServer(async (base) => {
  const restore = withUser(account({ isActive: false }));
  try {
    const res = await fetch(`${base}/me`, { headers: { authorization: 'Bearer mock-token' } });
    assert.equal(res.status, 403);
  } finally { restore(); }
}));

test('GET /me returns the profile with its role landing', withServer(async (base) => {
  const restore = withUser(account());
  try {
    const res = await fetch(`${base}/me`, { headers: { authorization: 'Bearer mock-token' } });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.role, 'teacher');
    assert.equal(data.landing, 'dashboard');
  } finally { restore(); }
}));

test('GET /users denies non-admin roles with 403', withServer(async (base) => {
  const restore = withUser(account({ role: 'teacher' }));
  try {
    const res = await fetch(`${base}/users`, { headers: { authorization: 'Bearer mock-token' } });
    assert.equal(res.status, 403);
  } finally { restore(); }
}));

test('GET /users allows designated admin roles (headteacher included)', withServer(async (base) => {
  const restore = withUser(account({ role: 'headteacher' }));
  try {
    const res = await fetch(`${base}/users`, { headers: { authorization: 'Bearer mock-token' } });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  } finally { restore(); }
}));

test('logout clears the session successfully', withServer(async (base) => {
  const res = await fetch(`${base}/logout`, { method: 'POST' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
}));

test('refresh returns the refreshed user with role landing', withServer(async (base) => {
  const restore = withUser(account());
  try {
    const res = await fetch(`${base}/refresh`, {
      headers: { authorization: 'Bearer mock-refresh-token' },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user.role, 'teacher');
    assert.equal(data.user.landing, 'dashboard');
  } finally { restore(); }
}));