// Date helpers. Calendar dates are plain "YYYY-MM-DD" strings and are handled
// as UTC midnights so day arithmetic never drifts across DST changes.
// Appointment times are local "YYYY-MM-DDTHH:MM" strings.

const DAY = 86400000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isDate = (s) => typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));

export const toUTC = (s) => Date.parse(s + "T00:00:00Z");

export const fromUTC = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Whole days from a to b (b - a). */
export const dayDiff = (a, b) => Math.round((toUTC(b) - toUTC(a)) / DAY);

export const addDays = (s, n) => fromUTC(toUTC(s) + n * DAY);

export const minDate = (a, b) => (a <= b ? a : b);
export const maxDate = (a, b) => (a >= b ? a : b);

/** Local calendar date for a Date (defaults to now). */
export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Local "YYYY-MM-DDTHH:MM" for a Date. */
export function localDateTime(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${localDate(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Parse a local "YYYY-MM-DDTHH:MM" into epoch ms (local time). */
export function parseLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s || "");
  if (!m) return NaN;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
}

export const hhmmToMin = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || "");
  return m ? +m[1] * 60 + +m[2] : NaN;
};

export const minToHHMM = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** First and last calendar day of a "YYYY-MM" period. */
export function periodBounds(period) {
  const [y, m] = period.split("-").map(Number);
  const start = `${period}-01`;
  const end = fromUTC(Date.UTC(y, m, 0));
  return { start, end };
}

export const monthOf = (date) => date.slice(0, 7);
