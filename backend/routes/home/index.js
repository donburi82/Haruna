// require('dotenv').config();
const express = require('express');
const router = express.Router();

const { User } = require('../../models/user');
const { Mission } = require('../../models/mission');
const { Goal } = require('../../models/goal');
const {
  getStartOfDay,
  getEndOfDay,
  getStartOfWeekSunday,
  addDays
} = require('../../helpers/date');

router.route('/').get(async (req, res) => {
  try {
    const userId = req.user.userId;  // from token

    // 1. Get basic user info
    const user = await User.findById(userId).select(
      'nickname points currentGoalId'
    );
    if (!user) {
      return res.status(404).json({ status: 'fail', msg: 'User not found' });
    }

    // 2. Get goal info
    const goalId = user.currentGoalId;
    const goal = await Goal.findById(goalId).select(
      'goalType startDate endDate'
    );

    // 3. Schedule & Missions
    const today = getStartOfDay(new Date());
    const weekStart = getStartOfWeekSunday(today);
    const weekEnd = getEndOfDay(addDays(weekStart, 6));

    // fetch missions for this week
    const weeklyMissions = await Mission.find({
      userId: userId,
      goalId: goalId,
      date: { $gte: weekStart, $lte: weekEnd }
    }).sort({ date: 1, order: 1 });

    // build map: dateString -> mission
    const missionMap = new Map();
    for (const m of weeklyMissions) {
      const dateKey = getStartOfDay(m.date).toISOString();
      if (!missionMap.has(dateKey)) {
        missionMap.set(dateKey, {});
      }
      const byOrder = missionMap.get(dateKey);
      byOrder[m.order] = m; // m.order is 1 or 2
    }

    // build weeklyStatus for 7 days (Sun–Sat)
    const weeklyStatus = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      const dayKey = getStartOfDay(dayDate).toISOString();
      const byOrder = missionMap.get(dayKey) || {};
      const m1 = byOrder[1];
      const m2 = byOrder[2];

      const isPastOrToday = dayDate <= today;
      const complete =
        !!m1 &&
        !!m2 &&
        !!m1.completed &&
        !!m2.completed &&
        isPastOrToday;

      weeklyStatus.push({
        date: dayDate.toISOString(),
        complete
      });
    }

    // today's missions
    const todayMissions = await Mission.find({
      userId: userId,
      goalId: goalId,
      date: { $gte: today, $lte: getEndOfDay(today) }
    }).sort({ order: 1 });

    let todayBlock = null;
    if (todayMissions.length > 0) {
      // normalize into an object keyed by order
      const byOrderToday = {};
      for (const m of todayMissions) {
        byOrderToday[m.order] = m;
      }

      const m1 = byOrderToday[1];
      const m2 = byOrderToday[2];

      let mood = null;
      if (m1 && m1.mood != null) {
        mood = m1.mood;
      } else if (m2 && m2.mood != null) {
        mood = m2.mood;
      }
      const moodSubmitted = !!mood;

      todayBlock = {
        date: today.toISOString(),
        mission1: m1
          ? {
              id: m1._id.toString(),
              text: m1.description,
              completed: !!m1.completed,
            }
          : null,
        mission2: m2
          ? {
              id: m2._id.toString(),
              text: m2.description,
              completed: !!m2.completed,
            }
          : null,
        mood,
        moodSubmitted
      };
    }

    // progress information
    const startDate = getStartOfDay(goal.startDate);
    const endDate = getStartOfDay(goal.endDate);
    const totalDays =
      Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const daysLeftRaw =
      Math.round((endDate - today) / (1000 * 60 * 60 * 24)) + 1;
    const daysLeft = Math.max(daysLeftRaw, 0);

    // return
    const responsePayload = {
      status: 'success',
      nickname: user.nickname,
      points: user.points,
      goal: {
        goalId: goalId.toString(),
        goalType: goal.goalType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDays,
        daysLeft
      },
      weeklyStatus,
      today: todayBlock
    };

    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'fail',
      msg: 'Internal server error'
    });
  }
});

router.route('/complete').patch(async (req, res) => {
  try {
    const userId = req.user.userId;  // from token
    const { missionIds } = req.body; // array of mission _id strings
    console.log(missionIds);

    // 1. Get user/goal info
    const user = await User.findById(userId).select('currentGoalId points');
    if (!user) {
      return res.status(404).json({ status: 'fail', msg: 'User not found' });
    }

    const goalId = user.currentGoalId;
    
    // 2. Find missions according to the id's
    const missions = await Mission.find({
      _id: { $in: missionIds },
      userId,
      goalId,
    });

    if (missions.length === 0) {
      return res
        .status(404)
        .json({ status: 'fail', msg: 'No missions found for given ids' });
    }

    // 3. compute points
    const now = new Date();
    let earnedPoints = 0;

    for (const m of missions) {
      if (!m.completed) {
        m.completed = true;
        m.completedAt = now;
        earnedPoints += m.pointsReward || 0;
      }
    }

    await Promise.all(missions.map((m) => m.save()));

    // 4. Update user's total points
    let updatedUser = user;
    if (earnedPoints > 0) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { points: earnedPoints } },
        { new: true }
      ).select('points');
    }

    return res.status(200).json({
      status: 'success',
      earnedPoints,
      totalPoints: updatedUser.points,
      updatedMissionIds: missions.map((m) => m._id.toString()),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'fail',
      msg: 'Internal server error'
    });
  }
});

router.route('/mood').patch(async (req, res) => {
  try {
    const userId = req.user.userId;  // from token
    const { mood } = req.body;
    console.log(mood);

    // 1. Get user/goal info
    const user = await User.findById(userId).select('currentGoalId points');
    if (!user) {
      return res.status(404).json({ status: 'fail', msg: 'User not found' });
    }

    const goalId = user.currentGoalId;
    
    // 2. update mood for the missions
    const today = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(today);

    const result = await Mission.updateMany(
      {
        userId,
        goalId,
        date: { $gte: today, $lte: todayEnd },
      },
      { $set: { mood } }
    );

    if (result.matchedCount === 0 && result.modifiedCount === 0) {
      return res.status(404).json({
        status: 'fail',
        msg: 'No missions found for today to attach mood',
      });
    }

    return res.status(200).json({
      status: 'success',
      mood,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'fail',
      msg: 'Internal server error'
    });
  }
});

module.exports = router;
