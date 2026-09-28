const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('./auth');

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const user = (role, isActive = true) => ({ _id: 'user-1', role, isActive });

test('protect rejects requests without a token', async () => {
  const res = makeRes();
  let nextCalled = false;
  await protect({ headers: {} }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('protect sets req.user when a valid active session is presented', async () => {
  const verify = mock.method(jwt, 'verify', () => ({ id: 'user-1' }));
  const findById = mock.method(User, 'findById', () => ({ select: async () => user('teacher') }));
  const req = { headers: { authorization: 'Bearer valid-token' } };
  let nextCalled = false;
  await protect(req, makeRes(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.role, 'teacher');
  verify.mock.restore();
  findById.mock.restore();
});

test('protect blocks a deactivated account with 403', async () => {
  const verify = mock.method(jwt, 'verify', () => ({ id: 'user-1' }));
  const findById = mock.method(User, 'findById', () => ({ select: async () => user('teacher', false) }));
  const res = makeRes();
  let nextCalled = false;
  await protect({ headers: { authorization: 'Bearer valid-token' } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.error.message, /deactivated/i);
  verify.mock.restore();
  findById.mock.restore();
});

test('protect rejects an invalid or expired token with 401', async () => {
  const verify = mock.method(jwt, 'verify', () => { throw new Error('jwt expired'); });
  const res = makeRes();
  let nextCalled = false;
  await protect({ headers: { authorization: 'Bearer bad-token' } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  verify.mock.restore();
});

test('protect rejects an unknown user with 404', async () => {
  const verify = mock.method(jwt, 'verify', () => ({ id: 'ghost' }));
  const findById = mock.method(User, 'findById', () => ({ select: async () => null }));
  const res = makeRes();
  let nextCalled = false;
  await protect({ headers: { authorization: 'Bearer valid-token' } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 404);
  verify.mock.restore();
  findById.mock.restore();
});

test('authorize denies when no user is attached', async () => {
  const res = makeRes();
  let nextCalled = false;
  await authorize('admin')({ headers: {} }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('authorize denies a role that is not permitted', async () => {
  const res = makeRes();
  let nextCalled = false;
  await authorize('admin', 'super-admin')({ headers: {}, user: user('teacher') }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.error.message, /not authorized/i);
});

test('authorize allows a permitted role', async () => {
  const next = { called: false };
  await authorize('admin', 'teacher')({ headers: {}, user: user('teacher') }, makeRes(), () => { next.called = true; });
  assert.equal(next.called, true);
});

test('authorize honors inherited leadership access', async () => {
  const next = { called: false };
  await authorize('academic-admin')({ headers: {}, user: user('hod') }, makeRes(), () => { next.called = true; });
  await authorize('academic-admin')({ headers: {}, user: user('director-of-studies') }, makeRes(), () => { next.called = true; });
  await authorize('admin')({ headers: {}, user: user('headteacher') }, makeRes(), () => { next.called = true; });
  assert.equal(next.called, true);
});