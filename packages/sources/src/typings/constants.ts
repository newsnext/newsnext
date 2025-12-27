/**
 * Standard refresh intervals in milliseconds
 */
export const Time = {
  /** Test interval (1ms) */
  Test: 1,
  /** Realtime updates (2 minutes) */
  Realtime: 2 * 60 * 1000,
  /** Fast updates (5 minutes) */
  Fast: 5 * 60 * 1000,
  /** Default interval (10 minutes) */
  Default: 10 * 60 * 1000,
  /** Common interval (30 minutes) */
  Common: 30 * 60 * 1000,
  /** Slow updates (1 hour) */
  Slow: 60 * 60 * 1000,
}