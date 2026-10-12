const test = require('node:test');
const assert = require('node:assert/strict');

const router = require('./reportCards');

test('report card router exposes verification and PDF endpoints', () => {
  const paths = router.stack
    .filter(layer => layer.route)
    .map(layer => layer.route.path);

  assert.ok(paths.includes('/verify/:token'));
  assert.ok(paths.includes('/:studentId/:term/pdf'));
});
