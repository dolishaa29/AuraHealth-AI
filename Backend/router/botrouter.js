const express = require("express");
const { chat, chatStream } = require("../service/botservice");
const { chatLimiter, guestChatLimiter } = require("../middleware/rateLimit");
const optionalAuth = require("../middleware/optionalAuth");
const router = express.Router();

router.post("/chat", optionalAuth, chatLimiter, guestChatLimiter, async (req, res) => {
  await chat(req, res);
});

router.post("/chat/stream", optionalAuth, chatLimiter, guestChatLimiter, async (req, res) => {
  await chatStream(req, res);
});

module.exports = router;
