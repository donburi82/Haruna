const getStartOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const getEndOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
};

const getStartOfWeekSunday = (d = new Date()) => {
  const dt = getStartOfDay(d);
  const day = dt.getDay(); // 0 = Sunday
  dt.setDate(dt.getDate() - day);
  return dt; // Sunday 00:00:00
};

const addDays = (d, days) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt;
};

module.exports = { getStartOfDay, getEndOfDay, getStartOfWeekSunday, addDays };
