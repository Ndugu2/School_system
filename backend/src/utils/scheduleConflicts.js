const timeToMinutes = (time) => {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const hasTimeOverlap = (firstStart, firstEnd, secondStart, secondEnd) => {
  const startA = timeToMinutes(firstStart);
  const endA = timeToMinutes(firstEnd);
  const startB = timeToMinutes(secondStart);
  const endB = timeToMinutes(secondEnd);
  if ([startA, endA, startB, endB].includes(null)) return false;
  return startA < endA && startB < endB && startA < endB && endA > startB;
};

module.exports = { timeToMinutes, hasTimeOverlap };
