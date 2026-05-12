import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  // 1) Create a Transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; max-width: 500px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${options.logoUrl}" alt="Epe Delivery Logo" style="max-width: 120px; height: auto;">
      </div>
      <h2 style="color: #1BAC4B; text-align: center; text-transform: capitalize">${options.type}</h2>
      <p>Hello ${options.name},</p>
      <p>You requested an OTP for ${options.type} for your <strong>Epe Delivery</strong> account.</p>
      <p>Your one-time ${options.type} (OTP) is:</p>
      <div style="font-size: 30px; font-weight: bold; letter-spacing: 2.5px; margin: 15px 0; color: #1BAC4B; text-align: center;">
        ${options.otp}
      </div>
      <p style="text-align: center; color: #666;">This code will expire in <strong>10 minutes</strong>. Please do not share it with anyone.</p>
      <p>If you didn’t request this change, you can ignore this email.</p>
      <br>
      <p>Thank you,</p>
      <p><strong>The Epe Delivery Team</strong></p>
    </div>
  `;

  const plainTextContent = `
Hello ${options.name},

You requested an OTP for ${options.type} for your Epe Delivery account.

Your one-time password (OTP) is: ${options.otp}

This code will expire in 10 minutes. Please do not share it with anyone.

If you didn’t request this OTP for verification, you can ignore this email.

Thank you,
The Epe Delivery Team
  `;

  // 2) Define the email options
  const mailOptions = {
    from: `"Epe Delivery Support" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: `${options.subject} – Epe Delivery`,
    text: plainTextContent,
    html: htmlContent,
  };

  // 3) Actually send the email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;
