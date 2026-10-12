const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_ASSESSMENT_WEIGHTS,
  DEFAULT_GRADE_BANDS,
  defaultGradeBands,
  calculateWeightedScore,
  gradeForPercentage,
  weightedAssessmentComponents,
} = require('./grading');

test('weighted assessment score applies the configured percentages', () => {
  assert.equal(calculateWeightedScore(
    { BOT: 80, MOT: 60, EOT: 90 },
    { BOT: 20, MOT: 20, EOT: 60 }
  ), 82);
  assert.equal(DEFAULT_ASSESSMENT_WEIGHTS.BOT + DEFAULT_ASSESSMENT_WEIGHTS.MOT + DEFAULT_ASSESSMENT_WEIGHTS.EOT, 100);
  assert.deepEqual(weightedAssessmentComponents([
    { examType: 'BOT', percentage: 100 },
    { examType: 'MOT', percentage: 50 },
    { examType: 'EOT', percentage: 80 },
  ], { BOT: 20, MOT: 20, EOT: 60 }), { BOT: 20, MOT: 10, EOT: 48 });
});

test('grade lookup uses configured thresholds, including the lower-bound band', () => {
  assert.equal(gradeForPercentage(89, DEFAULT_GRADE_BANDS).grade, 'D2');
  assert.equal(gradeForPercentage(90, DEFAULT_GRADE_BANDS).grade, 'D1');
  assert.equal(gradeForPercentage(0, DEFAULT_GRADE_BANDS).grade, 'F9');
  assert.equal(gradeForPercentage(70, [{ grade: 'Pass', minPercentage: 50, points: 1 }, { grade: 'Fail', minPercentage: 0, points: 0 }]).grade, 'Pass');
  assert.equal(gradeForPercentage(80, defaultGradeBands('S5')).grade, 'A');
  assert.equal(gradeForPercentage(0, defaultGradeBands('S5')).points, 0);
});
