const { getModel } = require("../config/gemini");
const LiveSession = require("../model/liveSession");
const {
  CREDIT_COSTS,
  LIVE_SESSION_MINUTES,
  spendCredits,
  notEnoughCreditsMsg,
} = require("../helper/credithelper");

const SKIN_PROMPT = `You are a professional skincare analysis expert. Analyze the skin visible in this image and respond in this exact format:

**Skin Type:** (Oily / Dry / Combination / Normal)

**Detected Concerns:**
- List each concern on its own line

**Possible Causes:**
- List the cause for each concern

**Recommendations:**
- List 2-3 quick actionable tips

Keep it short and clear. If the image is blurry or does not show skin/face clearly, just say: "Image not clear enough for analysis."`;

exports.startSession = async (req, res) => {
  const user = req.user;
  const now = new Date();
  const newExpiry = new Date(now.getTime() + LIVE_SESSION_MINUTES * 60 * 1000);

  try {
    await LiveSession.updateOne(
      { user: user._id, expiresAt: { $lte: now } },
      { $set: { expiresAt: newExpiry } },
      { upsert: true }
    );
  } catch (err) {
    if (err.code !== 11000) {
      throw err;
    }
    const running = await LiveSession.findOne({ user: user._id });
    return res.status(200).json({ success: true, expiresAt: running.expiresAt, charged: false });
  }

  const cost = CREDIT_COSTS.liveSession;
  const balance = await spendCredits(user._id, cost, "Live skin analysis (" + LIVE_SESSION_MINUTES + " min)");

  if (balance === null) {

    await LiveSession.updateOne({ user: user._id }, { $set: { expiresAt: now } });
    return res.status(402).json({ success: false, message: notEnoughCreditsMsg(cost, "A live analysis session") });
  }

  return res.status(201).json({ success: true, expiresAt: newExpiry, charged: true, credits: balance });
};

exports.analyzeSkin = async (req, res) => {
  try {
    const { frame } = req.body;
    if (!frame) {
      return res.status(400).json({ success: false, message: "No frame provided" });
    }

    const session = await LiveSession.exists({ user: req.user._id, expiresAt: { $gt: new Date() } });
    if (!session) {
      return res.status(402).json({
        success: false,
        sessionEnded: true,
        message: "Your live session has ended. Start a new session to continue.",
      });
    }

    const base64Data = frame.replace(/^data:image\/\w+;base64,/, "");
    const model = getModel();
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
      SKIN_PROMPT,
    ]);

    res.status(200).json({
      success: true,
      analysis: result.response.text(),
    });

  } catch (error) {
    console.error("Skin analysis error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
