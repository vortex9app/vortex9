'use strict';

function createLimiter() {
  const buckets = new Map();
  return function allow(name, limit, windowMs, now) {
    const time = Number.isFinite(now) ? now : Date.now();
    const recent = (buckets.get(name) || []).filter((stamp) => time - stamp < windowMs);
    if (recent.length >= limit) {
      buckets.set(name, recent);
      return false;
    }
    recent.push(time);
    buckets.set(name, recent);
    return true;
  };
}

module.exports = { createLimiter };
