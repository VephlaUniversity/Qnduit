import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendVerificationEmail = async (
  email,
  name,
  otp
) => {
  try {
    await sgMail.send({
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: "Qnduit Jobs",
      },
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          
          <h2 style="color: #0d6efd;">Email Verification</h2>

          <p>Dear <strong>${name}</strong>,</p>

          <p>
            Thank you for creating an account on <strong>Qnduit Jobs</strong>.
          </p>

          <p>
            Please use the verification code below to verify your email address:
          </p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 6px;
            margin: 20px 0;
            color: #0d6efd;
          ">
            ${otp}
          </div>

          <p>
            This code will expire in <strong>10 minutes</strong>.
          </p>

          <p>
            If you did not create this account, please ignore this email.
          </p>

          <br/>

          <p>Qnduit Team</p>

        </div>
      `,
    });

    console.log("✅ Verification email sent via SendGrid");
  } catch (error) {
    console.error(
      "❌ SendGrid Error:",
      error.response?.body || error.message
    );

    throw error;
  }
};