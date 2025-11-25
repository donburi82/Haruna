const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const GENDER_OPTIONS = ['Male', 'Female', 'Prefer Not to Say'];

const ALLERGY_OPTIONS = [
  'N/A',
  'Gluten-free',
  'Peanut allergy',
  'Tree nut allergy',
  'Dairy-free / Lactose intolerance',
  'Egg allergy',
  'Soy allergy',
  'Shellfish allergy',
  'Wheat allergy',
  'Peach allergy / Stone fruit allergy',
  'Fish allergy'
];

const DIETARY_PREFERENCES = [
  'N/A',
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Kosher',
  'Halal',
  'Low FODMAP',
  'Keto / Low-carb',
  'Diabetic-friendly',
  'Low-sodium',
  'High-protein'
];

const OTHER_OPTIONS = [
  'N/A',
  'Caffeine-free',
  'Sugar-free',
  'No added sugar'
];
  
const userSchema = new mongoose.Schema(
  {
    // mongoose generated userId: _id
    // point is 0 for all users
    points: { type: Number, required: true, default: 0 },

    // account (step 1)
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    nickname: { type: String, required: true },

    // step 1
    gender: { type: String, enum: GENDER_OPTIONS, required: true },
    dob: { type: Date, required: true },

    // assigned after step 2
    currentGoalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', default: null },

    // step 3
    allergies: { type: String, enum: ALLERGY_OPTIONS, required: true },
    dietaryPreference: { type: String, enum: DIETARY_PREFERENCES, required: true },
    otherOption: { type: String, enum: OTHER_OPTIONS, required: true }
  },
  {
    timestamps: true // auto adds createdAt & updatedAt
  }
);

// Indexes
// automatic by unique
// userSchema.index({ email: 1 });
userSchema.index({ currentGoalId: 1 });

// Verification
userSchema.methods.createJWT = function () {
  return jwt.sign(
    { userId: this._id, role: this.role },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );
};

userSchema.methods.comparePassword = async function (canditatePassword) {
  const isMatch = await bcrypt.compare(canditatePassword, this.passwordHash);
  return isMatch;
};

const User = mongoose.model('User', userSchema);

module.exports = { User };
