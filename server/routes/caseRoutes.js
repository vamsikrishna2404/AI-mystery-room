const express = require('express');
const router = express.Router();

const {
  createMystery,
  getMystery,
  discoverClue,
  requestHint,
  submitAccusation,
  getMysteryResult
} = require('../controllers/caseController');

// Generate mystery
router.post('/', createMystery);

// Retrieve mystery
router.get('/:id', getMystery);

// Request a hint
router.post('/:id/hints', requestHint);

// Discover a clue
router.post('/:id/clues/:clueId/discover', discoverClue);

// Submit accusation
router.post('/:id/accuse', submitAccusation);

// Retrieve completed mystery result
router.get('/:id/result', getMysteryResult);

module.exports = router;