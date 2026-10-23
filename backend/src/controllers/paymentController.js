import process from "node:process";
import { initiateSubscriptionCheckout, selectUnpaidSubscription, activateVerifiedSubscription, recordFailedSubscriptionPayment } from "../services/subscriptionLifecycle.js";
import { resolveTalentPublication } from "../services/talentPublication.js";
import flutterwave from "../utils/flutterwave.js";
import crypto from "crypto";
import Talent from "../models/Talent.js";
import TalentSubscription from "../models/TalentSubscription.js";
import TalentPayment from "../models/TalentPayment.js";
import Employer from "../models/Employer.js";
import EmployerSubscription from "../models/EmployerSubscription.js";
import EmployerPayment from "../models/EmployerPayment.js";

const respondLifecycleError = (error, res, next) => {
  if (typeof error.code === "string" && error.code.startsWith("SUBSCRIPTION_")) {
    return res.status(error.status || 503).json({ success: false, code: error.code, message: error.message });
  }
  next(error);
};

// EMPLOYER PLANS

const EMPLOYER_PLANS = {
  bronze: {
    amount: 6.99,
    currency: "USD",
    paymentPlanId: Number(
      process.env.FLW_EMPLOYER_BRONZE_PLAN_ID
    ),
  },

  silver: {
    amount: 8.99,
    currency: "USD",
    paymentPlanId: Number(
      process.env.FLW_EMPLOYER_SILVER_PLAN_ID
    ),
  },

  platinum: {
    amount: 12.99,
    currency: "USD",
    paymentPlanId: Number(
      process.env.FLW_EMPLOYER_PLATINUM_PLAN_ID
    ),
  },
};


// TALENT PLANS

const TALENT_PLANS = {
  public: {
    amount: 1.99,
    currency: "USD",
    paymentPlanId: Number(
      process.env.FLW_TALENT_PUBLIC_PLAN_ID
    ),
  },
};

// CREATE TALENT CHECKOUT

export const createCheckoutSession = async (
  req,
  res,
  next
) => {
  try {
    if (req.user.role !== "talent") return res.status(403).json({ message: "Talent account required." });
    const talentId = req.user._id;
    const { plan } = req.body;

    // FREE PLAN

    if (plan === "free") {
      await selectUnpaidSubscription({ role: "talent", accountId: talentId, plan });

      return res.json({
        success: true,
        free: true,
        redirectUrl:
          `${process.env.FRONTEND_URL}/talent-dashboard`,
      });
    }

    // VALIDATE PAID PLAN

    const selectedPlan = Object.hasOwn(TALENT_PLANS, plan) ? TALENT_PLANS[plan] : null;

    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment plan",
      });
    }

    if (!selectedPlan.paymentPlanId) {
      return res.status(500).json({
        success: false,
        message:
          "Flutterwave talent payment plan is not configured",
      });
    }

    // GET TALENT

    const talent = await Talent.findById(talentId);

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Talent not found",
      });
    }

    if (!talent.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    const existingSubscription =
      await TalentSubscription.findOne({
        talent: talent._id,
        status: {
          $in: [
            "active",
            "past_due",
          ],
        },
      });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an active subscription",
      });
    }

    // UNIQUE TRANSACTION REFERENCE

    const txRef =
      `QND-TAL-${talent._id}-${Date.now()}-${crypto
        .randomBytes(4)
        .toString("hex")}`;

    await initiateSubscriptionCheckout({ role: "talent", accountId: talent._id, plan, txRef,
      amount: selectedPlan.amount, currency: selectedPlan.currency, paymentPlanId: selectedPlan.paymentPlanId });

    // FLUTTERWAVE CHECKOUT

    const response = await flutterwave.post(
      "/payments",
      {
        tx_ref: txRef,

        amount: selectedPlan.amount,

        currency: selectedPlan.currency,

        payment_plan:
          selectedPlan.paymentPlanId,

        redirect_url:
          `${process.env.BACKEND_URL}` +
          `/api/payments/callback`,

        customer: {
          email: talent.email,

          name:
            talent.fullName ||
            `${talent.firstName || ""} ${
              talent.lastName || ""
            }`.trim(),

          phonenumber:
            talent.phone || undefined,
        },

        customizations: {
          title: "Qnduit Talent Plan",
          description:
            "Qnduit Public Talent Plan",
        },

        meta: {
          talentId:
            talent._id.toString(),

          plan,

          txRef,
        },

        configurations: {
          session_duration: 10,
          max_retry_attempt: 5,
        },
      }
    );



    return res.json({
      success: true,
      checkoutUrl:
        response.data?.data?.link,
      txRef,
    });
  } catch (error) {
    console.error(
      "Flutterwave talent checkout error:",
      error.response?.data ||
        error.message
    );

    respondLifecycleError(error, res, next);
  }
};

// TALENT FLUTTERWAVE CALLBACK

export const talentFlutterwaveCallback = async (
  req,
  res,
  next
) => {
  try {
    const {
      tx_ref,
      transaction_id,
    } = req.query;

    if (!tx_ref || !transaction_id) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/cancelled`
      );
    }

    const payment =
      await TalentPayment.findOne({
        txRef: tx_ref,
      });

    if (!payment) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/cancelled`
      );
    }

    const response = await flutterwave.get(
      `/transactions/${transaction_id}/verify`
    );

    const transaction =
      response.data?.data;

    if (
      !transaction ||
      transaction.status !== "successful" ||
      transaction.tx_ref !== payment.txRef ||
      transaction.currency !== payment.currency ||
      Number(transaction.amount) <
        Number(payment.amount)
    ) {
      await recordFailedSubscriptionPayment({ role: "talent", paymentId: payment._id });

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/cancelled`
      );
    }

    const activation = await activateTalentPayment(payment, transaction);

    return res.redirect(
      `${process.env.FRONTEND_URL}/payment/success${activation.activated ? "" : "?activation=blocked"}`
    );
  } catch (error) {
    console.error(
      "Flutterwave talent callback error:",
      error.response?.data ||
        error.message
    );

    respondLifecycleError(error, res, next);
  }
};

// ACTIVATE TALENT PAYMENT

export const activateTalentPayment = (payment, transaction) =>
  activateVerifiedSubscription({ role: "talent", paymentId: payment._id, transaction });

// Get Talent Subscription
export const getMySubscription = async (req, res, next) => {
  try {
    if (req.user.role !== "talent") {
      return res.status(403).json({ message: "Talent account required." });
    }
    const subscription = await TalentSubscription.findOne({
      talent: req.user._id,
    });

    const publication = await resolveTalentPublication(req.user._id);
    res.json({
      success: true,
      subscription,
      ...publication,
    });
  } catch (error) {
    respondLifecycleError(error, res, next);
  }
};


// CREATE EMPLOYER CHECKOUT SESSION

export const createEmployerCheckoutSession = async (
  req,
  res,
  next
) => {
  try {
    if (req.user.role !== "employer") return res.status(403).json({ message: "Employer account required." });
    const employerId = req.user._id;
    const { plan } = req.body;

    const selectedPlan = Object.hasOwn(EMPLOYER_PLANS, plan) ? EMPLOYER_PLANS[plan] : null;

    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        message: "Invalid employer payment plan",
      });
    } 

    if (!selectedPlan.paymentPlanId) {
      return res.status(500).json({
        success: false,
        message: `Flutterwave ${plan} payment plan is not configured`,
      });
    }

    const employer = await Employer.findById(employerId);

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer not found",
      });
    }

    if (!employer.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // Prevent duplicate active subscriptions
    const existingSubscription =
      await EmployerSubscription.findOne({
        employer: employer._id,
        status: "active",
      });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: "You already have an active subscription",
      });
    }

    // Unique Flutterwave transaction reference
    const txRef = `QND-EMP-${employer._id}-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}`;

    const fullName =
      employer.displayName ||
      `${employer.firstName || ""} ${
        employer.lastName || ""
      }`.trim();

    // Create pending payment record BEFORE redirecting
    await initiateSubscriptionCheckout({ role: "employer", accountId: employer._id, plan, txRef,
      amount: selectedPlan.amount, currency: selectedPlan.currency, paymentPlanId: selectedPlan.paymentPlanId });

    const response = await flutterwave.post("/payments", {
      tx_ref: txRef,

      amount: selectedPlan.amount,

      currency: selectedPlan.currency,

      payment_plan: selectedPlan.paymentPlanId,

      redirect_url:
        `${process.env.BACKEND_URL}` +
        `/api/payments/employer/payment/callback`,

      customer: {
        email: employer.email,
        name: fullName,
        phonenumber: employer.phone || undefined,
      },

      customizations: {
        title: "Qnduit Employer Plan",
        description: `${plan} employer plan`,
      },

      meta: {
        employerId: employer._id.toString(),
        plan,
        txRef,
      },

      configurations: {
        session_duration: 10,
        max_retry_attempt: 5,
      },
    });



    return res.json({
      success: true,
      checkoutUrl: response.data?.data?.link,
      txRef,
    });
  } catch (error) {
    console.error(
      "Flutterwave employer checkout error:",
      error.response?.data || error.message
    );

    respondLifecycleError(error, res, next);
  }
};

// EMPLOYER FLUTTER CALLBAACK

export const employerFlutterwaveCallback = async (
  req,
  res,
  next
) => {
  try {
    const {
      tx_ref,
      transaction_id,
    } = req.query;

    if (!tx_ref || !transaction_id) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/employer/payment/cancelled`
      );
    }

    const payment = await EmployerPayment.findOne({
      txRef: tx_ref,
    });

    if (!payment) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/employer/payment/cancelled`
      );
    }

    // Always verify with Flutterwave
    const response = await flutterwave.get(
      `/transactions/${transaction_id}/verify`
    );

    const transaction = response.data?.data;

    if (
      !transaction ||
      transaction.status !== "successful" ||
      transaction.tx_ref !== payment.txRef ||
      transaction.currency !== payment.currency ||
      Number(transaction.amount) < Number(payment.amount)
    ) {
      await recordFailedSubscriptionPayment({ role: "employer", paymentId: payment._id });

      return res.redirect(
        `${process.env.FRONTEND_URL}/employer/payment/cancelled`
      );
    }

    const activation = await activateEmployerPayment(payment, transaction);

    return res.redirect(
      `${process.env.FRONTEND_URL}/employer/payment/success${activation.activated ? "" : "?activation=blocked"}`
    );
  } catch (error) {
    console.error(
      "Flutterwave employer callback error:",
      error.response?.data || error.message
    );

    respondLifecycleError(error, res, next);
  }
};


// ACTIVATE EMPLOYER SUBSCRIPTION

export const activateEmployerPayment = (payment, transaction) =>
  activateVerifiedSubscription({ role: "employer", paymentId: payment._id, transaction });

// GET EMPLOYER SUBSCRIPTION

export const getEmployerSubscription = async (
  req,
  res,
  next
) => {
  try {
    const subscription =
      await EmployerSubscription.findOne({
        employer: req.user._id,
      });

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
      });
    }

    return res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    respondLifecycleError(error, res, next);
  }
};

// CANCEL EMPLOYER SUBSCRIPTION

/*export const cancelEmployerSubscription = async (
  req,
  res,
  next
) => {
  try {
    const subscription =
      await EmployerSubscription.findOne({
        employer: req.user._id,
        status: {
          $in: [
            "active",
            "trialing",
            "past_due",
          ],
        },
      });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Active subscription not found",
      });
    }

    const updatedSubscription =
      await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

    subscription.cancelAtPeriodEnd = true;

    await subscription.save();

    return res.json({
      success: true,
      message:
        "Subscription will be cancelled at the end of the current billing period",
      subscription: updatedSubscription,
    });
  } catch (error) {
    next(error);
  }
};

// RESUME EMPLOYER SUBSCRIPTION

export const resumeEmployerSubscription = async (
  req,
  res,
  next
) => {
  try {
    const subscription =
      await EmployerSubscription.findOne({
        employer: req.user._id,
        stripeSubscriptionId: {
          $exists: true,
        },
      });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const updatedSubscription =
      await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: false,
        }
      );

    subscription.cancelAtPeriodEnd = false;

    await subscription.save();

    return res.json({
      success: true,
      message:
        "Subscription cancellation has been reversed",
      subscription: updatedSubscription,
    });
  } catch (error) {
    next(error);
  }
};*/

// EMPLOYER PAY LATER

export const employerPayLater = async (req, res, next) => {
  try {
    if (req.user.role !== "employer") return res.status(403).json({ message: "Employer account required." });
    const employerId = req.user._id;
    const { plan } = req.body;

    if (!plan || !["bronze", "silver", "platinum"].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employer plan",
      });
    }

    await selectUnpaidSubscription({ role: "employer", accountId: employerId, plan });

    return res.json({
      success: true,
      message: "Plan selected. Payment can be completed later.",
      plan,
      redirectUrl: `${process.env.FRONTEND_URL}/dashboard`,
    });
  } catch (error) {
    respondLifecycleError(error, res, next);
  }
};