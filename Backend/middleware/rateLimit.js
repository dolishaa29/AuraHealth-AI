const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { getRedisClients } = require("../config/redisClient");

async function sendCommand(...args) {
  const { pubClient } = await getRedisClients();
  return pubClient.sendCommand(args);
}

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand, prefix: "rl:chat:" }),
  message: { success: false, message: "Too many requests, please slow down." },
});

const skinAnalysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand, prefix: "rl:skin:" }),
  message: { success: false, message: "Too many requests, please slow down." },
});

const triageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand, prefix: "rl:triage:" }),
  message: { success: false, message: "Too many requests, please slow down." },
});

const hospitalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand, prefix: "rl:hospital:" }),
  message: { success: false, message: "Too many requests, please slow down." },
});


const GUEST_CHAT_PER_DAY = 5;
const guestChatLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: GUEST_CHAT_PER_DAY,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => Boolean(req.user),
  store: new RedisStore({ sendCommand, prefix: "rl:guestchat:" }),
  message: {
    success: false,
    message: "You've used your " + GUEST_CHAT_PER_DAY + " free messages for today. Log in to keep chatting.",
  },
});

const prescriptionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand, prefix: "rl:prescription:" }),
  message: { msg: "Too many scans. Please try again in a minute." },
});

const wellnessLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand, prefix: "rl:wellness:" }),
  message: { msg: "Too many requests. Try again in a minute." },
});

module.exports = { chatLimiter, skinAnalysisLimiter, triageLimiter, hospitalLimiter, guestChatLimiter, prescriptionLimiter, wellnessLimiter };
