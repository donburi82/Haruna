// require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const { User } = require('../../models/user');
const { Goal } = require('../../models/goal');
const { generateMissionsForGoal } = require('../../helpers/mission');

router.route('/signup').post(async (req, res) => {
  try {
    const { account, profile, goal } = req.body;

    // basic shape check
    if (!account || !profile || !goal) {
      return res
        .status(400)
        .json({ status: 'fail', msg: 'Missing account, profile, or goal data' });
    }

    const { nickname, email, password } = account;
    const { gender, dob, allergies, dietaryPreference, otherOption } = profile;
    const { goalType, startDate, endDate } = goal;

    // user creation
    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ status: 'fail', msg: 'Email already in use' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // console.log('Creating user');
    const user = await User.create({
      email: email,
      passwordHash: hashedPassword,
      nickname: nickname,
      gender: gender,
      dob: new Date(dob),
      allergies: allergies,
      dietaryPreference: dietaryPreference,
      otherOption: otherOption,
      currentGoalId: null, // set after goalcreation
    });

    // goal creation
    // console.log('Creating goal');
    const goalDoc = await Goal.create({
      userId: user._id,
      goalType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'active',
    });
    user.currentGoalId = goalDoc._id;
    await user.save();

    // JWT
    console.log('Creating JWT');
    const token = user.createJWT();

    // mission generation using ChatGPT
    console.log('Generating missions for goal');
    await generateMissionsForGoal(user, goalDoc);

    return res.status(201).json({
      status: 'success',
      token: token,
      user: {
        userId: user._id,
        email: user.email,
        nickname: user.nickname,
        points: user.points,
        currentGoalId: user.currentGoalId,
      },
      goal: {
        goalId: goalDoc._id,
        goalType: goalDoc.goalType,
        startDate: goalDoc.startDate,
        endDate: goalDoc.endDate,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res
      .status(500)
      .json({ status: 'fail', msg: 'Internal server error' });
  }
});

router.route('/login').post(async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ status: 'fail', msg: 'incorrect credentials' });
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json({ status: 'fail', msg: 'incorrect credentials' });
    }

    const goalDoc = await Goal.findOne({ _id: user.currentGoalId });
    const token = user.createJWT();

    return res.status(200).json({
      status: 'success',
      token,
      user: {
        userId: user._id,
        email: user.email,
        nickname: user.nickname,
        points: user.points,
        currentGoalId: user.currentGoalId,
      },
      goal: {
        goalId: goalDoc._id,
        goalType: goalDoc.goalType,
        startDate: goalDoc.startDate,
        endDate: goalDoc.endDate,
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ status: 'error', msg: error.message });
  }
});

module.exports = router;
