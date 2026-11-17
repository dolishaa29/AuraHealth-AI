const User = require("../model/user");
const CreditTransaction = require("../model/creditTransaction");

const WELCOME_CREDITS = 100;

const CREDIT_COSTS = {
  reportAnalysis: 10,
  slotBooking: 20,
  appointmentRequest: 20,
  aiChat: 1,
  liveSession: 5,
};

const LIVE_SESSION_MINUTES = 10;

const CREDIT_PACKS = [
  { id: "starter", name: "Starter", credits: 100, price: 10 },
  { id: "plus", name: "Plus", credits: 300, price: 249, tag: "Popular" },
  { id: "pro", name: "Pro", credits: 1000, price: 699, tag: "Best value" },
];

function findPack(packId) {
  return CREDIT_PACKS.find((pack) => pack.id === packId) || null;
}

async function giveWelcomeBonus(userId) {
  const result = await User.updateOne(
    { _id: userId, credits: { $exists: false } },
    { $set: { credits: WELCOME_CREDITS } }
  );

  if (result.modifiedCount === 1) {
    await CreditTransaction.create({
      user: userId,
      type: "credit",
      amount: WELCOME_CREDITS,
      reason: "Welcome bonus",
      balanceAfter: WELCOME_CREDITS,
    });
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
  await giveWelcomeBonus(userId);

  const user = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { credits: amount } },
    { returnDocument: "after", session: session }
  );

  await CreditTransaction.create(
    [{
      user: userId,
      type: "credit",
      amount: amount,
      reason: reason,
      balanceAfter: user.credits,
      orderId: orderId,
    }],
    { session: session }
  );

  return user.credits;
}

function notEnoughCreditsMsg(cost, featureName) {
  return featureName + " costs " + cost + " credits. You don't have enough credits. Buy more on the Credits page.";
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
