// controllers/paymentController.js
import axios from "axios";
import Employer from "../models/Employer.js";
import { PLANS } from "../config/plans.js";

export const initializePayment = async (req, res, next) => {
  try {
    const employerId = req.user._id;
    const { plan } = req.body;

    const employer = await Employer.findById(employerId);

    if (!PLANS[plan]) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: employer.email,
        amount: PLANS[plan].price * 100, // convert to kobo
        callback_url: `${process.env.CLIENT_URL}/payment-success`,
        metadata: {
          employerId,
          plan,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    res.json({
      success: true,
      authorization_url: response.data.data.authorization_url,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ message: "No reference provided" });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data.data;

    if (data.status !== "success") {
      return res.status(400).json({ message: "Payment not successful" });
    }

    const { employerId, plan } = data.metadata;

    if (!PLANS[plan]) {
      return res.status(400).json({ message: "Invalid plan in metadata" });
    }

    const expectedAmount = PLANS[plan].price * 100;

    if (data.amount !== expectedAmount) {
      return res.status(400).json({ message: "Amount mismatch" });
    }

    const employer = await Employer.findById(employerId);

    if (!employer) {
      return res.status(404).json({ message: "Employer not found" });
    }

    if (employer.paymentStatus === "paid") {
      return res.json({ success: true, message: "Already verified" });
    }

    employer.paymentStatus = "paid";
    employer.selectedPlan = plan;
    employer.paystackReference = reference;
    employer.isTrial = false;

    const duration = PLANS[plan].durationDays;

    employer.planExpiresAt = new Date(
      Date.now() + duration * 24 * 60 * 60 * 1000
    );

    await employer.save();

    res.json({ success: true, message: "Payment verified successfully" });

  } catch (error) {
    next(error);
  }
};

export const selectPlanWithoutPayment = async (req, res) => {
  const employerId = req.user._id;
  const { plan } = req.body;

  const employer = await Employer.findById(employerId);

  employer.selectedPlan = plan;
  employer.paymentStatus = "pending";
  employer.isTrial = true;

  // 3–7 days trial
  employer.trialEndsAt = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000
  );

  await employer.save();

  res.json({
    success: true,
    message: "Plan activated with limited access (trial mode)",
  });
};