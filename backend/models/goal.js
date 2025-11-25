const mongoose = require('mongoose');

const GOAL_TYPES = [
  'Weight management',
  'Strength building',
  'Nutrition management',
  'Inflammatory control',
  'Immunity boosting',
  'Skincare',
];

const GOAL_STATUSES = ['active', 'completed', 'cancelled'];
  
const goalSchema = new mongoose.Schema({
    // mongoose generated userId: _id
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    goalType: { type: String, enum: GOAL_TYPES, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    durationDays: { type: Number, min: 1 },
    status: { type: String, enum: GOAL_STATUSES, default: 'active', required: true },
});

goalSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = this.endDate.getTime() - this.startDate.getTime();
    this.durationDays = Math.round(diff / msPerDay);
  }
  next();
});

// Indexes
goalSchema.index({ userId: 1, status: 1, startDate: 1 });

const Goal = mongoose.model('Goal', goalSchema);

module.exports = { Goal };
