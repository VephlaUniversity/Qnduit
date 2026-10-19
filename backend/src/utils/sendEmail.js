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

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Sends a Contact-page message to the team inbox. Replies go to the visitor.
export const sendContactEmail = async ({
  to,
  fullName,
  email,
  roleLabel,
  subjectLabel,
  message,
}) => {
  await sgMail.send({
    to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: "Qnduit Contact Form",
    },
    replyTo: { email, name: fullName },
    subject: `[Contact] ${subjectLabel} - ${fullName}`,
    text: `New message from the Qnduit contact page\n\nName: ${fullName}\nEmail: ${email}\nContacting as: ${roleLabel}\nSubject: ${subjectLabel}\n\n${message}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #0d6efd;">New contact message</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Contacting as:</strong> ${escapeHtml(roleLabel)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subjectLabel)}</p>
        <hr/>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
    `,
  });
};
