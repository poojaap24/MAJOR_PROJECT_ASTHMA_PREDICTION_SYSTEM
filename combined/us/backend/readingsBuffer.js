// ============================================
// readingsBuffer.js
// Keeps the last 16 readings per location in memory.
// Simple approach for now - no database needed yet.
// (If you add real sensors later, swap this for a small
// SQLite table - same idea, just persists across restarts.)
// ============================================

const LOOKBACK = 16;

// { "locationName": [ {pm25, pm10, ...}, ... up to 16 ] }
const buffers = {};

function addReading(location, reading) {
  if (!buffers[location]) {
    buffers[location] = [];
  }

  buffers[location].push(reading);

  // Keep only the last 16
  if (buffers[location].length > LOOKBACK) {
    buffers[location].shift();
  }
}

function getWindow(location) {
  return buffers[location] || [];
}

function isReady(location) {
  return getWindow(location).length === LOOKBACK;
}

module.exports = { addReading, getWindow, isReady, LOOKBACK };