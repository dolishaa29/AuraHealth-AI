const User = require("../model/user");
const CreditTransaction = require("../model/creditTransaction");
const {
  BOOKING_CREDITS,
  CONSULTATION_CREDIT_PRICE_PAISE,
} = require("../config/consultationPricing");

const WELCOME_CREDITS = 30;

const CREDIT_COSTS = {
  reportAnalysis: 10,
  slotBooking: BOOKING_CREDITS,
  aiChat: 1,
  liveSession: 5,
};

const LIVE_SESSION_MINUTES = 10;

const CREDIT_PACKS = [
  { id: "starter", name: "Starter", credits: 100, aiCredits: 10 },
  { id: "plus", name: "Plus", credits: 300, aiCredits: 30 },
  { id: "pro", name: "Pro", credits: 1000, aiCredits: 100 },
].map((pack) => ({ ...pack, price: (pack.credits * CONSULTATION_CREDIT_PRICE_PAISE) / 100 }));

function findPack(packId) {
  return CREDIT_PACKS.find((pack) => pack.id === packId) || null;
}

async function giveWelcomeBonus(userId, session = null) {
  const result = await User.updateOne(
    { _id: userId, credits: { $exists: false } },
    { $set: { credits: WELCOME_CREDITS } },
    { session }
  );

  if (result.modifiedCount === 1) {
    await CreditTransaction.create(
      [
        {
          user: userId,
          type: "credit",
          amount: WELCOME_CREDITS,
          reason: "Welcome bonus",
          balanceAfter: WELCOME_CREDITS,
        },
      ],
      { session }
    );
  }
}

async function getBalance(userId) {
  await giveWelcomeBonus(userId);
  const user = await User.findById(userId).select("credits");
  return user ? user.credits : 0;
}

async function spendCredits(userId, amount, reason) {
  await giveWelcomeBonus(userId);

  const user = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: amount } },
    { $inc: { credits: -amount } },
    { returnDocument: "after" }
  );

  if (!user) {
    return null;
  }

  await CreditTransaction.create({
    user: userId,
    type: "debit",
    amount: amount,
    reason: reason,
    balanceAfter: user.credits,
  });

  return user.credits;
}

async function addCredits(userId, amount, reason, orderId = null, session = null) {
  await giveWelcomeBonus(userId, session);

  const user = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { credits: amount } },
    { returnDocument: "after", session: session }
  );

  await CreditTransaction.create(
    [
      {
        user: userId,
        type: "credit",
        amount: amount,
        reason: reason,
        balanceAfter: user.credits,
        orderId: orderId,
      },
    ],
    { session: session }
  );

  return user.credits;
}

function notEnoughCreditsMsg(cost, featureName) {
  return (
    featureName +
    " costs " +
    cost +
    " credits. You don't have enough credits. Buy more on the Credits page."
  );
}

module.exports = {
  WELCOME_CREDITS,
  CREDIT_COSTS,
  LIVE_SESSION_MINUTES,
  CREDIT_PACKS,
  findPack,
  getBalance,
  spendCredits,
  addCredits,
  notEnoughCreditsMsg,
};
