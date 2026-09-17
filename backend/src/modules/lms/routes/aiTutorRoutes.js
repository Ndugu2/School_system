const express = require('express');
const router = express.Router();
const { protect } = require('../../../middleware/auth');

// Simple rule-based AI Tutor for generating educational hints, encouragement, and study recommendations.
router.post('/hint', protect, async (req, res) => {
  const { questionText, studentAnswer, subjectName } = req.body;

  try {
    let hint = "Let's think about this step-by-step. Break the question down into parts, and check your calculations or basic formulas.";
    let feedbackType = 'general';

    if (subjectName) {
      const sub = subjectName.toLowerCase();
      if (sub.includes('math') || sub.includes('arithmetic')) {
        hint = "Remember the order of operations (BODMAS). Do division and multiplication before addition and subtraction. Double check your signs!";
        feedbackType = 'math';
      } else if (sub.includes('science') || sub.includes('physic') || sub.includes('chemist') || sub.includes('biolog')) {
        hint = "Identify the key physical laws or biological principles at play here. Are there units we need to convert first? What constants apply?";
        feedbackType = 'science';
      } else if (sub.includes('history') || sub.includes('social studies')) {
        hint = "Think about the historical timeline, the key figures involved, and the main geographical context of the event.";
        feedbackType = 'humanities';
      }
    }

    if (studentAnswer && studentAnswer.trim().length > 0) {
      hint += ` You answered "${studentAnswer}". Let's verify if that matches the core definition or rules we studied this term.`;
    }

    res.json({
      hint,
      feedbackType,
      encouragement: "Don't give up! Every mistake is a step closer to understanding.",
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
