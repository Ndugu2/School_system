/**
 * Grading helpers for the dual NCDC / UACE report-card engine.
 *
 * Pure functions (no I/O) so they can be unit-tested in isolation.
 * Reference: web/docs/SYSTEM_DOCUMENTATION.md section "Curriculum & Assessment Engine".
 */

// UACE 20-point grading scale (Upper Secondary S5–S6).
// Exact thresholds are fixed and covered by unit tests to prevent drift.
const uaceGrade = (percentage) => {
  if (percentage >= 80) return { letter: 'A', points: 6 };
  if (percentage >= 70) return { letter: 'B', points: 5 };
  if (percentage >= 60) return { letter: 'C', points: 4 };
  if (percentage >= 50) return { letter: 'D', points: 3 };
  if (percentage >= 40) return { letter: 'E', points: 2 };
  if (percentage >= 35) return { letter: 'O', points: 1 };
  return { letter: 'F', points: 0 };
};

// NCDC 3-point competency scale → descriptor bands (Lower Secondary S1–S4).
const COMPETENCY_SCALE = [
  { label: 'Basic', min: 1.0, max: 1.49 },
  { label: 'Moderate', min: 1.5, max: 2.49 },
  { label: 'Outstanding', min: 2.5, max: 3.0 },
];

const competencyLabel = (score) => {
  if (score == null || isNaN(score)) return '—';
  const found = COMPETENCY_SCALE.find(c => score >= c.min && score <= c.max);
  return found ? found.label : (score > 3 ? 'Outstanding' : 'Basic');
};

/**
 * Compute the UACE aggregate on the 20-point scale.
 *
 * Rules (per SYSTEM_DOCUMENTATION.md):
 *   • Best 3 Principal subjects: 6 points each (A) → 18 max.
 *   • General Paper (GP): Pass = 1 point.
 *   • Subsidiary subject: Pass = 1 point.
 *   • Total out of 20 (6 + 6 + 6 + 1 + 1).
 *
 * @param {Array} subjects items shaped `{ type: 'principal'|'subsidiary'|'general', points }`.
 * @returns {{ total: number, outOf: number, best3: number[], gpPass: number, subsidiaryPass: number, breakdown: string }}
 */
const computeUACEAggregate = (subjects = []) => {
  const principalPoints = [];
  let gpPass = 0;
  let subsidiaryPass = 0;

  for (const s of subjects) {
    const points = Number.isFinite(s.points) ? s.points : 0;
    if (s.type === 'subsidiary') subsidiaryPass = points > 0 ? 1 : 0;
    else if (s.type === 'general') gpPass = points > 0 ? 1 : 0;
    else principalPoints.push(points);
  }

  const best3 = [...principalPoints].sort((a, b) => b - a).slice(0, 3);
  const total = Math.min(20, best3.reduce((sum, p) => sum + p, 0) + gpPass + subsidiaryPass);

  return {
    total,
    outOf: 20,
    best3,
    gpPass,
    subsidiaryPass,
    breakdown: `Best 3 Principal (${best3.join(' + ')}) + General Paper (${gpPass}) + Subsidiary (${subsidiaryPass})`,
  };
};

module.exports = { uaceGrade, competencyLabel, COMPETENCY_SCALE, computeUACEAggregate };