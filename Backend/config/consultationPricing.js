const BOOKING_CREDITS = 100;
const CONSULTATION_CREDIT_PRICE_PAISE = 300;
const DOCTOR_FEE_PAISE = 15000;
const PLATFORM_RESERVE_PER_VISIT_PAISE = 10000;

function maxFeeForPayment(amountPaise, credits, providerFeePaise) {
  if (!Number.isSafeInteger(credits) || credits < BOOKING_CREDITS || credits % BOOKING_CREDITS !== 0
    || !Number.isSafeInteger(amountPaise) || amountPaise < credits * CONSULTATION_CREDIT_PRICE_PAISE) return 0;
  const fee = Math.max(Number.isSafeInteger(providerFeePaise) ? providerFeePaise : 0, Math.ceil(amountPaise / 20));
  const netPerVisit = Math.floor((amountPaise - fee) / (credits / BOOKING_CREDITS));
  return netPerVisit >= DOCTOR_FEE_PAISE + PLATFORM_RESERVE_PER_VISIT_PAISE ? DOCTOR_FEE_PAISE : 0;
}

module.exports = { BOOKING_CREDITS, CONSULTATION_CREDIT_PRICE_PAISE, DOCTOR_FEE_PAISE, maxFeeForPayment };
