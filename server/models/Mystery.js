
const mongoose = require('mongoose');

// Suspect Schema
const suspectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  motive: {
    type: String,
    default: ''
  },
  alibi: {
    type: String,
    default: ''
  }
});

// Clue Schema
const clueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  relatedSuspect: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  isDiscovered: {
    type: Boolean,
    default: false
  }
});

// Solution Schema
const solutionSchema = new mongoose.Schema({
  culpritId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  explanation: {
    type: String,
    required: true
  }
}, {
  _id: false
});

// Accusation Schema
const accusationSchema = new mongoose.Schema({
  suspectId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  submittedAt: {
    type: Date,
    default: null
  }
}, {
  _id: false
});

// Main Mystery Schema
const mysterySchema = new mongoose.Schema({

  title: {
    type: String,
    required: true
  },

  story: {
    type: String,
    required: true
  },

  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },

  suspects: {
    type: [suspectSchema],
    required: true
  },

  clues: {
    type: [clueSchema],
    required: true
  },

  hints: {
    type: [String],
    default: []
  },

  hintsUsed: {
    type: Number,
    default: 0,
    min: 0
  },

  discoveredClues: [{
    type: mongoose.Schema.Types.ObjectId
  }],

  accusation: {
    type: accusationSchema,
    default: () => ({})
  },

  // Private solution - hidden from normal queries
  solution: {
    type: solutionSchema,
    required: true,
    select: false
  },

  score: {
    type: Number,
    default: 0,
    min: 0
  },

  isCompleted: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// Export Mystery Model
module.exports = mongoose.model('Mystery', mysterySchema);
