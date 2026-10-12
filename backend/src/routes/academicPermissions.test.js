const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('./academicPermissions');

test('academic permission router exposes grant, window update, and revocation routes', () => {
  const routes = router.stack.filter(layer => layer.route).map(layer => ({
    path: layer.route.path,
    methods: Object.keys(layer.route.methods),
  }));
  assert.ok(routes.some(route => route.path === '/' && route.methods.includes('post')));
  assert.ok(routes.some(route => route.path === '/:id' && route.methods.includes('patch')));
  assert.ok(routes.some(route => route.path === '/:id/revoke' && route.methods.includes('patch')));
});
