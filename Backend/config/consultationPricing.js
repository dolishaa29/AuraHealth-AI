const BOOKING_CREDITS = 100;
const CONSULTATION_CREDIT_PRICE_PAISE = 300;
const DOCTOR_FEE_PAISE = 15000;
const PLATFORM_RESERVE_PER_VISIT_PAISE = 10000;
const usablePayment = { status: "paid", liveFunding: true, fundingBlocked: { $ne: true } };

function bookingPaymentFilter() {
  if (process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) {
    return { ...usablePayment, liveFunding: false, consultationBundle: true };
  }
  return { ...usablePayment, maxDoctorFeePaise: { $gte: DOCTOR_FEE_PAISE } };
}

function maxFeeForPayment(amountPaise, credits, providerFeePaise) {
  const visits = credits / BOOKING_CREDITS;
  if (!Number.isSafeInteger(visits) || visits < 1) return 0;

  if (!Number.isSafeInteger(amountPaise) || amountPaise < credits * CONSULTATION_CREDIT_PRICE_PAISE)
    return 0;

  const estimatedGatewayFee = Math.ceil(amountPaise / 20);

  const gatewayFee = Number.isSafeInteger(providerFeePaise)
    ? Math.max(estimatedGatewayFee, providerFeePaise)
    : estimatedGatewayFee;

  const requiredFunding = visits * (DOCTOR_FEE_PAISE + PLATFORM_RESERVE_PER_VISIT_PAISE);

  return amountPaise - gatewayFee >= requiredFunding ? DOCTOR_FEE_PAISE : 0;
}

module.exports = {
  BOOKING_CREDITS,
  CONSULTATION_CREDIT_PRICE_PAISE,
  DOCTOR_FEE_PAISE,
  maxFeeForPayment,
  usablePayment,
  bookingPaymentFilter,
};
