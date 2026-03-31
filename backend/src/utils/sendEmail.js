/*import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const sendEmployerVerificationEmail = async (
  email: string,
  name: string,
  otp: string
) => {
  try {
    await sgMail.send({
      to: email,
      from: "Qnduit Jobs <no-reply@qnduit.com>",
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          
          <h2 style="color: #0d6efd;">Email Verification</h2>

          <p>Dear <strong>${name}</strong>,</p>

          <p>Thank you for creating an account on <strong>Qnduit Jobs</strong>.</p>

          <p>Please use the verification code below to verify your email address:</p>

          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 20px 0; color: #0d6efd;">
            ${otp}
          </div>

          <p>This code will expire in <strong>10 minutes</strong>.</p>

          <p>If you did not create this account, please ignore this email.</p>

          <br/>

          <p>Qnduit Team</p>

        </div>
      `,
    });

    console.log("✅ OTP email sent via SendGrid");
  } catch (error) {
    console.error("❌ SendGrid Error:", error);
  }
};*/

import nodemailer from "nodemailer";

export const sendEmployerVerificationEmail = async (
  email,
  name,
  otp
) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true, // true if using port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `Qnduit Jobs <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          
          <h2 style="color: #0d6efd;">Email Verification</h2>

          <p>Dear <strong>${name}</strong>,</p>

          <p>Thank you for creating an account on <strong>Qnduit Jobs</strong>.</p>

          <p>Please use the verification code below to verify your email address:</p>

          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 20px 0; color: #0d6efd;">
            ${otp}
          </div>

          <p>This code will expire in <strong>10 minutes</strong>.</p>

          <p>If you did not create this account, please ignore this email.</p>

          <br/>

          <p>Qnduit Team</p>

        </div>
      `,
    });

    console.log("✅ OTP email sent using Namecheap email");
  } catch (error) {
    console.error("❌ Email error:", error);
  }
};