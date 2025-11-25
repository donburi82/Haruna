const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { Mission } = require('../models/mission');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const normalizeMidnight = (d) => {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
};

const buildMissionPrompt = ({ user, goal, numberOfDays }) => {
  const dobStr = user.dob ? user.dob.toISOString().split('T')[0] : 'unknown';

  return {
    system: `
You are a wellness and nutrition advisor.
You create safe, lightweight daily missions that help users gradually improve their health and habits.
Your missions must NOT give medical diagnoses, nor override medical professionals.
Always assume the user may have underlying health issues and avoid extreme diets, fasting, or unsafe exercise.
`.trim(),
    user: `
User profile:
- Gender: ${user.gender}
- Date of birth: ${dobStr}
- Allergies: ${user.allergies}
- Dietary preference: ${user.dietaryPreference}
- Other options: ${user.otherOption}

Goal:
- Type: ${goal.goalType}
- Duration: ${numberOfDays} days

Task:
Provide a ${numberOfDays}-day plan that consists of TWO missions per day for achieving the goal:
1. One mission that is directly related to diet (e.g., meal choices, hydration, gentle adjustments consistent with the user's dietary preference and allergies).
2. One mission that is a relevant supportive habit (e.g., light movement, sleep hygiene, stress management, skincare routines if relevant, etc.).

Constraints:
- Day 1 must be very lightweight and easy to complete.
- Increase difficulty and commitment VERY gradually over the days.
- Missions must be realistically achievable in about 10–30 minutes each.
- Diet related missions should be affordable for users with low income.
- Respect allergies and dietary preferences (never suggest foods that conflict with them).
- Do NOT give medical treatment instructions or strict clinical protocols.

Output format:
Return ONLY valid JSON in the following exact structure:

{
  "plan": [
    {
      "day": 1,
      "diet_mission": "One clear, actionable diet-related mission for day 1.",
      "other_mission": "One clear, actionable non-diet mission for day 1."
    },
    {
      "day": 2,
      "diet_mission": "…",
      "other_mission": "…"
    }
    // continue up to day ${numberOfDays}
  ]
}

Important:
- Include all days from 1 through ${numberOfDays}, in order.
- Each "diet_mission" and "other_mission" must be a single concise sentence or bullet-style instruction.
- Do NOT include any extra keys, commentary, or text outside the JSON object.
`.trim(),
  };
};

/**
 * Generate all missions for a goal in one GPT call and insert into MongoDB.
 * @param {mongoose.Document} user  - User document
 * @param {mongoose.Document} goal  - Goal document
 */
async function generateMissionsForGoal(user, goal) {
  const startDate = normalizeMidnight(goal.startDate);
  const endDate = normalizeMidnight(goal.endDate);

  const diffMs = endDate.getTime() - startDate.getTime();
  const numberOfDays = Math.round(diffMs / MS_PER_DAY) + 1;
  if (numberOfDays <= 0) {
    throw new Error('Invalid goal dates: endDate must be after startDate');
  }

  const { system, user: userMsg } = buildMissionPrompt({
    user,
    goal,
    numberOfDays,
  });

  // Call OpenAI – using Chat Completions with JSON output
  // See: https://platform.openai.com/docs/api-reference/chat/create 
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMsg },
    ],
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content;
  console.log(raw);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse mission plan JSON:', err, raw);
    throw new Error('Mission plan JSON parsing failed');
  }

  if (!parsed || !Array.isArray(parsed.plan)) {
    throw new Error('Mission plan format invalid: missing "plan" array');
  }

  console.log(parsed);

  const docs = [];

  for (const entry of parsed.plan) {
    const dayIndex = entry.day;
    const dietText = entry.diet_mission;
    const otherText = entry.other_mission;

    if (
      typeof dayIndex !== 'number' ||
      !Number.isInteger(dayIndex) ||
      dayIndex < 1 ||
      dayIndex > numberOfDays
    ) {
      console.warn('Skipping invalid dayIndex in mission plan:', entry);
      continue;
    }

    if (typeof dietText !== 'string' || typeof otherText !== 'string') {
      console.warn('Skipping entry with invalid mission text:', entry);
      continue;
    }

    const date = new Date(startDate.getTime() + (dayIndex - 1) * MS_PER_DAY);

    docs.push(
      {
        userId: user._id,
        goalId: goal._id,
        date,
        order: 1,
        description: dietText,
        completed: false,
        completedAt: null,
      },
      {
        userId: user._id,
        goalId: goal._id,
        date,
        order: 2,
        description: otherText,
        completed: false,
        completedAt: null,
      }
    );
  }

  if (!docs.length) {
    throw new Error('No valid missions generated from plan');
  }

  await Mission.insertMany(docs);
}

module.exports = { generateMissionsForGoal };
