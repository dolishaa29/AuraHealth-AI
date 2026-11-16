const { getModel, GEMINI_API_KEY } = require("../config/gemini");
const { CREDIT_COSTS, spendCredits, addCredits, notEnoughCreditsMsg } = require("../helper/credithelper");

async function chargeForMessage(req) {
  if (!req.user) {
    return true;
  }
  const balance = await spendCredits(req.user._id, CREDIT_COSTS.aiChat, "AI chat message");
  return balance !== null;
}

async function refundMessage(req) {
  if (req.user) {
    await addCredits(req.user._id, CREDIT_COSTS.aiChat, "Refund: AI chat failed");
  }
}

exports.chat = async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(400).json({
      success: false,
      message: "GEMINI_API_KEY is not configured",
    });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      message: "Prompt is required",
    });
  }

  const paid = await chargeForMessage(req);
  if (!paid) {
    return res.status(402).json({
      success: false,
      message: notEnoughCreditsMsg(CREDIT_COSTS.aiChat, "Each chat message"),
    });
  }

  try {
    const model = getModel();

    const result = await model.generateContent(prompt);

    res.status(200).json({
      success: true,
      text: result.response.text(),
    });
  } catch (error) {
    console.error("Gemini Error:", error);
    await refundMessage(req);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.chatStream = async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(400).json({
      success: false,
      message: "GEMINI_API_KEY is not configured",
    });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      message: "Prompt is required",
    });
  }

  const paid = await chargeForMessage(req);
  if (!paid) {
    return res.status(402).json({
      success: false,
      message: notEnoughCreditsMsg(CREDIT_COSTS.aiChat, "Each chat message"),
    });
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let clientClosed = false;
  res.on("close", () => {
    clientClosed = true;
  });

  let sentSomething = false;

  try {
    const model = getModel();
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      if (clientClosed) break;
      const chunkText = chunk.text();
      if (!chunkText) continue;
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      sentSomething = true;
    }

    if (!clientClosed) {
      await result.response;
      res.write(`event: done\ndata: {}\n\n`);
    }
  } catch (error) {
    console.error("Gemini Stream Error:", error);

    if (!sentSomething) {
      await refundMessage(req).catch((err) => console.log("Chat refund failed:", err.message));
    }
    if (!clientClosed) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
    }
  } finally {
    if (!clientClosed) res.end();
  }
};
