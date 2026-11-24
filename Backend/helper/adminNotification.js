const nodemailer = require("nodemailer");

const recipient = "dolishagandhi2905@gmail.com";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL, pass: process.env.PASS_KEY },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

async function notifyAdmin(subject, message, path) {
  const frontend = process.env.FRONTEND_URL?.replace(/\/+$/, "");
  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: recipient,
      subject: `AuraHealth | ${subject}`,
      text: frontend ? `${message}\n\nReview in AuraHealth: ${frontend}${path}` : message,
    });
  } catch (error) {
    console.error("Admin notification failed:", subject, error.code || error.name);
  }
}

module.exports = notifyAdmin;
