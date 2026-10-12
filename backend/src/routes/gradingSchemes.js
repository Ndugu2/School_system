const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const GradingScheme = require('../models/GradingScheme');
const {
  DEFAULT_ASSESSMENT_WEIGHTS,
  DEFAULT_GRADE_BANDS,
  defaultGradeBands,
  getGradingScheme,
} = require('../utils/grading');

const router = express.Router();
const validLevels = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

const validateScheme = ({ assessmentWeights, gradeBands }) => {
  if (!assessmentWeights || !gradeBands || !Array.isArray(gradeBands) || gradeBands.length === 0) {
    return 'Assessment weights and grade bands are required';
  }
  const weightValues = ['BOT', 'MOT', 'EOT'].map(key => Number(assessmentWeights[key]));
  if (weightValues.some(value => !Number.isFinite(value) || value < 0 || value > 100) ||
      weightValues.reduce((sum, value) => sum + value, 0) !== 100) {
    return 'BOT, MOT and EOT weights must be valid percentages that total 100';
  }
  const grades = new Set();
  const thresholds = new Set();
  for (const band of gradeBands) {
    if (!band.grade?.trim() || !Number.isFinite(Number(band.minPercentage)) ||
        Number(band.minPercentage) < 0 || Number(band.minPercentage) > 100 ||
        !Number.isFinite(Number(band.points)) || Number(band.points) < 0) {
      return 'Every grade band requires a grade, a 0–100 minimum percentage, and non-negative points';
    }
    if (grades.has(band.grade.trim()) || thresholds.has(Number(band.minPercentage))) {
      return 'Grade names and minimum percentages must be unique';
    }
    grades.add(band.grade.trim());
    thresholds.add(Number(band.minPercentage));
  }
  if (!thresholds.has(0)) return 'Grade bands must include a 0% lower-bound band';
  return null;
};

router.get('/', protect, authorize('admin', 'super-admin', 'headteacher', 'academic-admin', 'director-of-studies'), async (req, res) => {
  const { classLevel, academicYear } = req.query;
  if (!validLevels.includes(classLevel) || !Number.isInteger(Number(academicYear))) {
    return res.status(400).json({ error: { message: 'Valid classLevel and academicYear are required' } });
  }
  try {
    const scheme = await getGradingScheme(classLevel, Number(academicYear));
    res.json(scheme);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.put('/', protect, authorize('admin', 'super-admin', 'headteacher'), async (req, res) => {
  const { classLevel, academicYear, assessmentWeights, gradeBands } = req.body;
  const year = Number(academicYear);
  if (!validLevels.includes(classLevel) || !Number.isInteger(year) || year < 2000) {
    return res.status(400).json({ error: { message: 'Valid classLevel and academicYear are required' } });
  }
  const validationError = validateScheme({ assessmentWeights, gradeBands });
  if (validationError) return res.status(400).json({ error: { message: validationError } });

  try {
    const scheme = await GradingScheme.findOneAndUpdate(
      { classLevel, academicYear: year },
      {
        classLevel,
        academicYear: year,
        assessmentWeights: Object.fromEntries(
          Object.entries(assessmentWeights).map(([key, value]) => [key, Number(value)])
        ),
        gradeBands: gradeBands.map(band => ({
          grade: band.grade.trim(),
          minPercentage: Number(band.minPercentage),
          points: Number(band.points),
        })),
        updatedBy: req.user._id,
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(scheme);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get('/defaults', protect, authorize('admin', 'super-admin', 'headteacher', 'academic-admin', 'director-of-studies'), (req, res) => {
  const classLevel = validLevels.includes(req.query.classLevel) ? req.query.classLevel : 'S1';
  res.json({ assessmentWeights: DEFAULT_ASSESSMENT_WEIGHTS, gradeBands: defaultGradeBands(classLevel) || DEFAULT_GRADE_BANDS });
});

module.exports = router;
