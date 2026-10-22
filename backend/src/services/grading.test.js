const test = require('node:test');
const assert = require('node:assert/strict');
const { uaceGrade, competencyLabel, computeUACEAggregate } = require('./grading');

// ── UACE grade boundaries (exact thresholds, per SYSTEM_DOCUMENTATION.md) ──
test('UACE: 80 and above is grade A with 6 points', () => {
  assert.deepEqual(uaceGrade(80), { letter: 'A', points: 6 });
  assert.deepEqual(uaceGrade(100), { letter: 'A', points: 6 });
});

test('UACE: 70-79 is grade B with 5 points', () => {
  assert.deepEqual(uaceGrade(70), { letter: 'B', points: 5 });
  assert.deepEqual(uaceGrade(79), { letter: 'B', points: 5 });
});

test('UACE: 60-69 is grade C with 4 points', () => {
  assert.deepEqual(uaceGrade(60), { letter: 'C', points: 4 });
  assert.deepEqual(uaceGrade(69), { letter: 'C', points: 4 });
});

test('UACE: 50-59 is grade D with 3 points', () => {
  assert.deepEqual(uaceGrade(50), { letter: 'D', points: 3 });
  assert.deepEqual(uaceGrade(59), { letter: 'D', points: 3 });
});

test('UACE: 40-49 is grade E with 2 points', () => {
  assert.deepEqual(uaceGrade(40), { letter: 'E', points: 2 });
  assert.deepEqual(uaceGrade(49), { letter: 'E', points: 2 });
});

test('UACE: 35-39 is grade O with 1 point', () => {
  assert.deepEqual(uaceGrade(35), { letter: 'O', points: 1 });
  assert.deepEqual(uaceGrade(39), { letter: 'O', points: 1 });
});

test('UACE: below 35 is grade F with 0 points', () => {
  assert.deepEqual(uaceGrade(34), { letter: 'F', points: 0 });
  assert.deepEqual(uaceGrade(0), { letter: 'F', points: 0 });
});

test('UACE: boundaries are exactly one below/at the cutoff', () => {
  assert.deepEqual(uaceGrade(34), { letter: 'F', points: 0 });
  assert.deepEqual(uaceGrade(35), { letter: 'O', points: 1 });
  assert.deepEqual(uaceGrade(39), { letter: 'O', points: 1 });
  assert.deepEqual(uaceGrade(40), { letter: 'E', points: 2 });
  assert.deepEqual(uaceGrade(49), { letter: 'E', points: 2 });
  assert.deepEqual(uaceGrade(50), { letter: 'D', points: 3 });
  assert.deepEqual(uaceGrade(59), { letter: 'D', points: 3 });
  assert.deepEqual(uaceGrade(60), { letter: 'C', points: 4 });
  assert.deepEqual(uaceGrade(69), { letter: 'C', points: 4 });
  assert.deepEqual(uaceGrade(70), { letter: 'B', points: 5 });
  assert.deepEqual(uaceGrade(79), { letter: 'B', points: 5 });
  assert.deepEqual(uaceGrade(80), { letter: 'A', points: 6 });
});

// ── NCDC competency descriptors ──
test('NCDC: competency descriptor bands', () => {
  assert.equal(competencyLabel(1.0), 'Basic');
  assert.equal(competencyLabel(1.4), 'Basic');
  assert.equal(competencyLabel(1.49), 'Basic');
  assert.equal(competencyLabel(1.5), 'Moderate');
  assert.equal(competencyLabel(2.0), 'Moderate');
  assert.equal(competencyLabel(2.49), 'Moderate');
  assert.equal(competencyLabel(2.5), 'Outstanding');
  assert.equal(competencyLabel(3.0), 'Outstanding');
  assert.equal(competencyLabel(null), '—');
});

// ── UACE aggregate (best 3 principal + GP + subsidiary, out of 20) ──
test('UACE aggregate: best 3 principal + GP + subsidiary', () => {
  const result = computeUACEAggregate([
    { type: 'principal', points: 6 },
    { type: 'principal', points: 5 },
    { type: 'principal', points: 4 },
    { type: 'general', points: 2 }, // pass → 1
    { type: 'subsidiary', points: 5 }, // pass → 1
  ]);
  assert.equal(result.total, 17); // 6 + 5 + 4 + 1 + 1
  assert.deepEqual(result.best3, [6, 5, 4]);
  assert.equal(result.gpPass, 1);
  assert.equal(result.subsidiaryPass, 1);
  assert.equal(result.total, 17); // 6+5+4 + 1 + 1
});

test('UACE aggregate: picks best 3 of 4 principal subjects', () => {
  const result = computeUACEAggregate([
    { type: 'principal', points: 5 },
    { type: 'principal', points: 6 },
    { type: 'principal', points: 4 },
    { type: 'principal', points: 6 },
    { type: 'general', points: 4 },
    { type: 'subsidiary', points: 3 },
  ]);
  assert.deepEqual(result.best3, [6, 6, 5]);
  assert.equal(result.total, 19); // 6+6+5 + 1 + 1
});

test('UACE aggregate: failed subsidiary contributes nothing', () => {
  const result = computeUACEAggregate([
    { type: 'principal', points: 6 },
    { type: 'principal', points: 6 },
    { type: 'principal', points: 6 },
    { type: 'general', points: 0 }, // fail → 0
    { type: 'subsidiary', points: 0 }, // fail → 0
  ]);
  assert.equal(result.total, 18); // 6+6+6 + 0 + 0
});

test('UACE aggregate: capped at 20', () => {
  const result = computeUACEAggregate([
    { type: 'principal', points: 6 },
    { type: 'principal', points: 6 },
    { type: 'principal', points: 6 },
    { type: 'general', points: 6 },
    { type: 'subsidiary', points: 6 },
  ]);
  assert.equal(result.total, 20);
});

test('UACE aggregate: empty subjects yields zero', () => {
  assert.equal(computeUACEAggregate([]).total, 0);
  assert.deepEqual(computeUACEAggregate([]).best3, []);
});