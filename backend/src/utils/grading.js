const DEFAULT_ASSESSMENT_WEIGHTS = Object.freeze({ BOT: 15, MOT: 15, EOT: 70 });
const O_LEVEL_GRADE_BANDS = Object.freeze([
  { grade: 'D1', minPercentage: 90, points: 1 },
  { grade: 'D2', minPercentage: 80, points: 2 },
  { grade: 'C3', minPercentage: 70, points: 3 },
  { grade: 'C4', minPercentage: 65, points: 4 },
  { grade: 'C5', minPercentage: 60, points: 5 },
  { grade: 'C6', minPercentage: 50, points: 6 },
  { grade: 'P7', minPercentage: 45, points: 7 },
  { grade: 'P8', minPercentage: 40, points: 8 },
  { grade: 'F9', minPercentage: 0, points: 9 },
]);
const UACE_GRADE_BANDS = Object.freeze([
  { grade: 'A', minPercentage: 80, points: 6 },
  { grade: 'B', minPercentage: 70, points: 5 },
  { grade: 'C', minPercentage: 60, points: 4 },
  { grade: 'D', minPercentage: 50, points: 3 },
  { grade: 'E', minPercentage: 40, points: 2 },
  { grade: 'F', minPercentage: 0, points: 0 },
]);
const defaultGradeBands = classLevel => ['S5', 'S6'].includes(classLevel) ? UACE_GRADE_BANDS : O_LEVEL_GRADE_BANDS;

const calculateWeightedScore = (marks, weights) => (
  Math.round(
    (Number(marks.BOT || 0) * weights.BOT +
      Number(marks.MOT || 0) * weights.MOT +
      Number(marks.EOT || 0) * weights.EOT) / 100
  )
);

const gradeForPercentage = (percentage, bands = O_LEVEL_GRADE_BANDS) => {
  const score = Number(percentage);
  const band = [...bands]
    .sort((a, b) => b.minPercentage - a.minPercentage)
    .find(item => score >= item.minPercentage);
  return band || bands[bands.length - 1];
};

const weightedAssessmentScore = (results, weights) => {
  const components = weightedAssessmentComponents(results, weights);
  return Math.round(components.BOT + components.MOT + components.EOT);
};

const weightedAssessmentComponents = (results, weights) => {
  const groups = {
    BOT: results.filter(result => ['BOT', 'coursework', 'assignment'].includes(result.examType)),
    MOT: results.filter(result => result.examType === 'MOT'),
    EOT: results.filter(result => ['EOT', 'mock'].includes(result.examType)),
  };
  const average = list => list.length
    ? list.reduce((sum, result) => sum + (result.percentage ?? (result.marksObtained / result.maxMarks) * 100), 0) / list.length
    : 0;
  return {
    BOT: average(groups.BOT) * weights.BOT / 100,
    MOT: average(groups.MOT) * weights.MOT / 100,
    EOT: average(groups.EOT) * weights.EOT / 100,
  };
};

const getGradingScheme = async (classLevel, academicYear) => {
  const GradingScheme = require('../models/GradingScheme');
  return await GradingScheme.findOne({ classLevel, academicYear }).lean() || {
    classLevel,
    academicYear,
    assessmentWeights: DEFAULT_ASSESSMENT_WEIGHTS,
    gradeBands: defaultGradeBands(classLevel),
  };
};

module.exports = {
  DEFAULT_ASSESSMENT_WEIGHTS,
  DEFAULT_GRADE_BANDS: O_LEVEL_GRADE_BANDS,
  defaultGradeBands,
  calculateWeightedScore,
  gradeForPercentage,
  getGradingScheme,
  weightedAssessmentComponents,
  weightedAssessmentScore,
};
