const mongoose = require('mongoose');
  
const missionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },

    // date (normalized to midnight)
    date: { type: Date, required: true },
    // mission #1 / mission #2 for that day
    order: { type: Number, enum: [1, 2], required: true },

    // content
    description: { type: String, required: true },
    pointsReward: { type: Number, default: 1 }, // default to 1 for now

    // mood tracking
    mood: { type: String, enum: ["Good", "Joyful", "Sad", "Bored", "Angry"], default: null },

    // completion tracking
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null }
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

missionSchema.pre('save', function (next) {
  if (this.date instanceof Date) {
    this.date.setHours(0, 0, 0, 0);
  }
  next();
});

// Indexes:
// 1) fast lookup for user's missions for a week and for today
missionSchema.index({ userId: 1, goalId: 1, date: 1 });
// 2) enforce max 2 missions per day per goal
missionSchema.index(
  { goalId: 1, date: 1, order: 1 },
  { unique: true }
);

const Mission = mongoose.model('Mission', missionSchema);

module.exports = { Mission };
