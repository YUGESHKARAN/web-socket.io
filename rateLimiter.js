/**
 * Production-ready Rate Limiter for Socket.io
 * Uses sliding window algorithm with automatic cleanup
 */

class RateLimiter {
  constructor(options = {}) {
    // Default configuration
    this.limits = {
      newMessage: { requests: 20, windowMs: 60000 },       // 5 messages per minute
      editMessage: { requests: 10, windowMs: 60000 },     // 10 edits per minute
      deleteMessage: { requests: 10, windowMs: 60000 },   // 10 deletes per minute
      joinPostRoom: { requests: 400, windowMs: 60000 },    // 20 joins per minute
      ...options.limits,
    };

    // Store request timestamps per user per event
    // Structure: { eventName: { userId: [timestamp1, timestamp2, ...] } }
    this.requestLog = {};

    // Initialize event logs
    Object.keys(this.limits).forEach(event => {
      this.requestLog[event] = {};
    });

    // Cleanup interval (every 5 minutes)
    this.cleanupInterval = options.cleanupInterval || 300000;
    this.startCleanup();
  }

  /**
   * Check if a request should be allowed
   * @param {string} eventName - Socket event name
   * @param {string} userId - User identifier (email or socket ID)
   * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
   */
  isAllowed(eventName, userId) {
    if (!this.limits[eventName]) {
      // No limit configured, allow
      return { allowed: true, remaining: -1, retryAfter: 0 };
    }

    const { requests, windowMs } = this.limits[eventName];
    const now = Date.now();

    // Initialize user log if not exists
    if (!this.requestLog[eventName][userId]) {
      this.requestLog[eventName][userId] = [];
    }

    const userLog = this.requestLog[eventName][userId];

    // Remove timestamps older than the window
    const windowStart = now - windowMs;
    const validRequests = userLog.filter(timestamp => timestamp > windowStart);
    this.requestLog[eventName][userId] = validRequests;

    // Check if limit exceeded
    if (validRequests.length >= requests) {
      const oldestRequest = validRequests[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }

    // Record this request
    this.requestLog[eventName][userId].push(now);

    return {
      allowed: true,
      remaining: requests - validRequests.length - 1,
      retryAfter: 0,
    };
  }

  /**
   * Reset rate limit for a specific user and event
   */
  resetUser(eventName, userId) {
    if (this.requestLog[eventName]) {
      delete this.requestLog[eventName][userId];
    }
  }

  /**
   * Reset all rate limits
   */
  resetAll() {
    Object.keys(this.requestLog).forEach(event => {
      this.requestLog[event] = {};
    });
  }

  /**
   * Clean up old entries to prevent memory leaks
   * Runs periodically
   */
  cleanup() {
    const now = Date.now();

    Object.keys(this.requestLog).forEach(eventName => {
      const { windowMs } = this.limits[eventName];
      const windowStart = now - windowMs;

      Object.keys(this.requestLog[eventName]).forEach(userId => {
        const validRequests = this.requestLog[eventName][userId].filter(
          timestamp => timestamp > windowStart
        );

        if (validRequests.length === 0) {
          // Delete empty entries
          delete this.requestLog[eventName][userId];
        } else {
          this.requestLog[eventName][userId] = validRequests;
        }
      });
    });
  }

  /**
   * Start automatic cleanup process
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup process (useful for testing or graceful shutdown)
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Get current stats (for monitoring)
   */
  getStats() {
    const stats = {};
    Object.keys(this.requestLog).forEach(eventName => {
      const userCount = Object.keys(this.requestLog[eventName]).length;
      const totalRequests = Object.values(this.requestLog[eventName]).reduce(
        (sum, logs) => sum + logs.length,
        0
      );
      stats[eventName] = { userCount, totalRequests };
    });
    return stats;
  }
}

module.exports = RateLimiter;
