
const mongoose = require('mongoose');
const Mystery = require('../models/Mystery');
const generateGeminiResponse = require('../config/gemini');
const { z } = require('zod');

// Difficulty settings
const difficultyConfig = {
  Easy: { suspects: 3, clues: 5, hints: 2, points: 100 },
  Medium: { suspects: 4, clues: 7, hints: 3, points: 150 },
  Hard: { suspects: 5, clues: 9, hints: 3, points: 200 }
};

// Validate Gemini response
const mysterySchema = z.object({
  title: z.string(),
  story: z.string(),
  suspects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      motive: z.string(),
      alibi: z.string()
    })
  ),
  clues: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      relatedSuspectIndex: z.number().int().min(0).nullable()
    })
  ),
  hints: z.array(z.string()),
  solution: z.object({
    culpritIndex: z.number().int().min(0),
    explanation: z.string()
  })
});

// 1. CREATE MYSTERY
const createMystery = async (req, res) => {
  try {
    const { premise, difficulty } = req.body;

    if (!premise || !difficultyConfig[difficulty]) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a premise and valid difficulty.'
      });
    }

    const config = difficultyConfig[difficulty];

    const prompt = `
Create a fictional, non-graphic detective mystery.

Premise: ${premise}
Difficulty: ${difficulty}

Generate exactly:
- ${config.suspects} suspects
- ${config.clues} clues
- ${config.hints} hints

The mystery must have one logically consistent culprit.
Keep all crime details fictional and non-actionable.

Return ONLY valid JSON in this format:
{
  "title": "Mystery title",
  "story": "Mystery story",
  "suspects": [
    {
      "name": "Suspect name",
      "description": "Description",
      "motive": "Possible motive",
      "alibi": "Alibi"
    }
  ],
  "clues": [
    {
      "title": "Clue title",
      "description": "Clue description",
      "relatedSuspectIndex": 0
    }
  ],
  "hints": ["Hint 1"],
  "solution": {
    "culpritIndex": 0,
    "explanation": "Explanation"
  }
}

Use suspect indexes starting from 0.
For unrelated clues, use null as relatedSuspectIndex.
`;

    const geminiResponse = await generateGeminiResponse(prompt);

    const cleanedResponse = geminiResponse
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsedResponse = JSON.parse(cleanedResponse);
    const validatedData = mysterySchema.parse(parsedResponse);

    // Validate exact counts
    if (
      validatedData.suspects.length !== config.suspects ||
      validatedData.clues.length !== config.clues ||
      validatedData.hints.length !== config.hints
    ) {
      return res.status(500).json({
        success: false,
        message: 'AI generated an incorrect number of suspects, clues or hints. Please try again.'
      });
    }

    // Validate suspect indexes
    const culpritIndex = validatedData.solution.culpritIndex;

    if (culpritIndex >= validatedData.suspects.length) {
      return res.status(500).json({
        success: false,
        message: 'AI generated an invalid culprit index.'
      });
    }

    for (const clue of validatedData.clues) {
      if (
        clue.relatedSuspectIndex !== null &&
        clue.relatedSuspectIndex >= validatedData.suspects.length
      ) {
        return res.status(500).json({
          success: false,
          message: 'AI generated an invalid suspect reference in a clue.'
        });
      }
    }

    // Generate MongoDB IDs for suspects
    const suspects = validatedData.suspects.map(suspect => ({
      ...suspect,
      _id: new mongoose.Types.ObjectId()
    }));

    // Create clues with suspect references
    const clues = validatedData.clues.map(clue => ({
      title: clue.title,
      description: clue.description,
      relatedSuspect:
        clue.relatedSuspectIndex === null
          ? null
          : suspects[clue.relatedSuspectIndex]._id
    }));

    const mystery = new Mystery({
      title: validatedData.title,
      story: validatedData.story,
      difficulty,
      suspects,
      clues,
      hints: validatedData.hints,
      solution: {
        culpritId: suspects[culpritIndex]._id,
        explanation: validatedData.solution.explanation
      }
    });

    await mystery.save();

    // Do not reveal clue descriptions or solution at creation time
    res.status(201).json({
      success: true,
      message: 'Mystery created successfully.',
      mystery: {
        id: mystery._id,
        title: mystery.title,
        story: mystery.story,
        difficulty: mystery.difficulty,
        suspects: mystery.suspects,
        clues: mystery.clues.map(clue => ({
          _id: clue._id,
          title: clue.title,
          isDiscovered: false
        })),
        hintsRemaining: mystery.hints.length,
        score: mystery.score
      }
    });

  } catch (error) {
    console.error('Create mystery error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to create mystery.',
      error: error.message
    });
  }
};

// 2. GET MYSTERY
const getMystery = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mystery ID.'
      });
    }

    const mystery = await Mystery.findById(id)
      .select('title story difficulty suspects clues hintsUsed score isCompleted createdAt')
      .lean();

    if (!mystery) {
      return res.status(404).json({
        success: false,
        message: 'Mystery not found.'
      });
    }

    const discoveredIds = (mystery.discoveredClues || []).map(id =>
      id.toString()
    );

    res.json({
      success: true,
      mystery: {
        id: mystery._id,
        title: mystery.title,
        story: mystery.story,
        difficulty: mystery.difficulty,
        suspects: mystery.suspects,
        clues: mystery.clues.map(clue => {
          const isDiscovered = discoveredIds.includes(
            clue._id.toString()
          );

          return {
            _id: clue._id,
            title: clue.title,
            isDiscovered,
            ...(isDiscovered ? { description: clue.description } : {})
          };
        }),
        hintsUsed: mystery.hintsUsed,
        score: mystery.score,
        isCompleted: mystery.isCompleted,
        createdAt: mystery.createdAt
      }
    });

  } catch (error) {
    console.error('Get mystery error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve mystery.',
      error: error.message
    });
  }
};

// 3. DISCOVER CLUE
const discoverClue = async (req, res) => {
  try {
    const { id, clueId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(clueId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mystery ID or clue ID.'
      });
    }

    const mystery = await Mystery.findById(id);

    if (!mystery) {
      return res.status(404).json({
        success: false,
        message: 'Mystery not found.'
      });
    }

    if (mystery.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'This mystery is already completed.'
      });
    }

    const clue = mystery.clues.id(clueId);

    if (!clue) {
      return res.status(404).json({
        success: false,
        message: 'Clue not found.'
      });
    }

    const alreadyDiscovered = mystery.discoveredClues.some(
      discoveredId => discoveredId.toString() === clueId
    );

    if (alreadyDiscovered) {
      return res.status(400).json({
        success: false,
        message: 'You have already discovered this clue.'
      });
    }

    mystery.discoveredClues.push(clue._id);
    clue.isDiscovered = true;
    mystery.score += 5;

    await mystery.save();

    res.json({
      success: true,
      message: 'Clue discovered successfully. 5 points added.',
      clue: {
        _id: clue._id,
        title: clue.title,
        description: clue.description
      },
      score: mystery.score,
      discoveredCluesCount: mystery.discoveredClues.length
    });

  } catch (error) {
    console.error('Discover clue error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to discover clue.',
      error: error.message
    });
  }
};

// 4. REQUEST HINT
const requestHint = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mystery ID.'
      });
    }

    const mystery = await Mystery.findById(id);

    if (!mystery) {
      return res.status(404).json({
        success: false,
        message: 'Mystery not found.'
      });
    }

    if (mystery.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'This mystery is already completed.'
      });
    }

    if (mystery.hintsUsed >= mystery.hints.length) {
      return res.status(400).json({
        success: false,
        message: 'No hints remaining.'
      });
    }

    const hint = mystery.hints[mystery.hintsUsed];

    mystery.hintsUsed += 1;
    mystery.score = Math.max(0, mystery.score - 10);

    await mystery.save();

    res.json({
      success: true,
      message: 'Hint provided successfully. 10 points deducted.',
      hint,
      hintsUsed: mystery.hintsUsed,
      hintsRemaining: mystery.hints.length - mystery.hintsUsed,
      score: mystery.score
    });

  } catch (error) {
    console.error('Request hint error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to provide hint.',
      error: error.message
    });
  }
};

// 5. SUBMIT ACCUSATION
const submitAccusation = async (req, res) => {
  try {
    const { id } = req.params;
    const { suspectId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(suspectId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid mystery ID and suspect ID are required.'
      });
    }

    // Explicitly include solution because its schema has select: false
    const mystery = await Mystery.findById(id).select('+solution');

    if (!mystery) {
      return res.status(404).json({
        success: false,
        message: 'Mystery not found.'
      });
    }

    if (mystery.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an accusation for this mystery.'
      });
    }

    const selectedSuspect = mystery.suspects.id(suspectId);

    if (!selectedSuspect) {
      return res.status(404).json({
        success: false,
        message: 'Selected suspect does not belong to this mystery.'
      });
    }

    const isCorrect =
      mystery.solution.culpritId.toString() === suspectId;

    const bonusPoints = isCorrect
      ? difficultyConfig[mystery.difficulty].points
      : 0;

    mystery.score = Math.max(0, mystery.score + bonusPoints);

    mystery.accusation = {
      suspectId: selectedSuspect._id,
      submittedAt: new Date()
    };

    mystery.isCompleted = true;

    await mystery.save();

    const culprit = mystery.suspects.id(
      mystery.solution.culpritId
    );

    res.json({
      success: true,
      message: isCorrect
        ? 'Correct accusation! You solved the mystery.'
        : 'Incorrect accusation. The mystery has ended.',
      result: {
        isCorrect,
        selectedSuspect: selectedSuspect.name,
        culprit: culprit ? culprit.name : 'Unknown',
        explanation: mystery.solution.explanation,
        difficulty: mystery.difficulty,
        bonusPoints,
        finalScore: mystery.score,
        hintsUsed: mystery.hintsUsed,
        discoveredCluesCount: mystery.discoveredClues.length
      }
    });

  } catch (error) {
    console.error('Submit accusation error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to submit accusation.',
      error: error.message
    });
  }
};

// 6. GET MYSTERY RESULT
const getMysteryResult = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mystery ID.'
      });
    }

    // Include solution because it has select: false
    const mystery = await Mystery.findById(id).select('+solution');

    if (!mystery) {
      return res.status(404).json({
        success: false,
        message: 'Mystery not found.'
      });
    }

    // Results are available only after an accusation
    if (!mystery.isCompleted || !mystery.accusation?.suspectId) {
      return res.status(400).json({
        success: false,
        message: 'This mystery has not been completed yet.'
      });
    }

    const selectedSuspect = mystery.suspects.id(
      mystery.accusation.suspectId
    );

    const culprit = mystery.suspects.id(
      mystery.solution.culpritId
    );

    const isCorrect =
      mystery.accusation.suspectId.toString() ===
      mystery.solution.culpritId.toString();

    res.json({
      success: true,
      message: 'Mystery result retrieved successfully.',
      result: {
        mysteryId: mystery._id,
        title: mystery.title,
        difficulty: mystery.difficulty,
        isCorrect,
        selectedSuspect: selectedSuspect
          ? selectedSuspect.name
          : 'Unknown',
        culprit: culprit ? culprit.name : 'Unknown',
        explanation: mystery.solution.explanation,
        finalScore: mystery.score,
        hintsUsed: mystery.hintsUsed,
        discoveredCluesCount: mystery.discoveredClues.length,
        completedAt: mystery.accusation.submittedAt
      }
    });

  } catch (error) {
    console.error('Get mystery result error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve mystery result.',
      error: error.message
    });
  }
};

// EXPORT ALL CONTROLLER FUNCTIONS
module.exports = {
  createMystery,
  getMystery,
  discoverClue,
  requestHint,
  submitAccusation,
  getMysteryResult
};
