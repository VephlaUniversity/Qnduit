import flutterwave from "../utils/flutterwave.js";
import crypto from "crypto";
import Talent from "../models/Talent.js";
import TalentSubscription from "../models/TalentSubscription.js";
import TalentPayment from "../models/TalentPayment.js";
import Employer from "../models/Employer.js";
import EmployerSubscription from "../models/EmployerSubscription.js";
import EmployerPayment from "../models/EmployerPayment.js";

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
    const talentId = req.user._id;
    const { plan } = req.body;

    // FREE PLAN

    if (plan === "free") {
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

      talent.selectedPlan = "free";
      talent.paymentStatus = "none";

      await talent.save();

      return res.json({
        success: true,
        free: true,
        redirectUrl:
          `${process.env.FRONTEND_URL}/talent-dashboard`,
      });
    }

    // VALIDATE PAID PLAN

    const selectedPlan = TALENT_PLANS[plan];

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

    await TalentPayment.create({
      talent: talent._id,
      provider: "flutterwave",
      txRef,
      amount: selectedPlan.amount,
      currency: selectedPlan.currency,
      plan,
      type: "subscription",
      status: "pending",
      metadata: {
        talentId: talent._id.toString(),
        plan,
      },
    });

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

    talent.selectedPlan = plan;
    talent.paymentStatus = "pending";

    await talent.save();

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

    next(error);
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
      payment.status = "failed";

      payment.failureReason =
        "Flutterwave transaction verification failed";

      payment.transactionId =
        transaction_id.toString();

      await payment.save();

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/cancelled`
      );
    }

    await activateTalentPayment(
      payment,
      transaction
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/payment/success`
    );
  } catch (error) {
    console.error(
      "Flutterwave talent callback error:",
      error.response?.data ||
        error.message
    );

    next(error);
  }
};

// ACTIVATE TALENT PAYMENT

export const activateTalentPayment = async (
  payment,
  transaction
) => {
  const talent =
    await Talent.findById(
      payment.talent
    );

  if (!talent) {
    throw new Error(
      "Talent not found"
    );
  }

  const startDate =
    new Date();

  const endDate =
    new Date(startDate);

  endDate.setMonth(
    endDate.getMonth() + 1
  );

  payment.transactionId =
    transaction.id?.toString();

  payment.flwRef =
    transaction.flw_ref;

  payment.status =
    "successful";

  payment.paidAt =
    new Date();

  payment.metadata = {
    ...(payment.metadata || {}),

    flutterwaveStatus:
      transaction.status,

    paymentType:
      transaction.payment_type,

    chargedAmount:
      transaction.charged_amount,
  };

  await payment.save();

  await TalentSubscription.findOneAndUpdate(
    {
      talent:
        talent._id,
    },

    {
      talent:
        talent._id,

      provider:
        "flutterwave",

      flutterwavePlanId:
        Number(
          process.env
            .FLW_TALENT_PUBLIC_PLAN_ID
        ),

      flutterwaveCustomerEmail:
        talent.email,

      plan:
        payment.plan,

      status:
        "active",

      currentPeriodStart:
        startDate,

      currentPeriodEnd:
        endDate,

      cancelAtPeriodEnd:
        false,

      lastTransactionId:
        transaction.id?.toString(),

      lastTxRef:
        payment.txRef,
    },

    {
      upsert: true,
      new: true,
    }
  );

  talent.selectedPlan =
    payment.plan;

  talent.paymentStatus =
    "active";

  await talent.save();
};

// Get Talent Subscription
export const getMySubscription = async (req, res, next) => {
  try {
    const subscription = await TalentSubscription.findOne({
      talent: req.user._id,
    });

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
      });
    }

    res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    next(error);
  }
};


// CREATE EMPLOYER CHECKOUT SESSION

export const createEmployerCheckoutSession = async (
  req,
  res,
  next
) => {
  try {
    const employerId = req.user._id;
    const { plan } = req.body;

    const selectedPlan = EMPLOYER_PLANS[plan];

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
    await EmployerPayment.create({
      employer: employer._id,
      provider: "flutterwave",
      txRef,
      amount: selectedPlan.amount,
      currency: selectedPlan.currency,
      plan,
      type: "subscription",
      status: "pending",
      metadata: {
        employerId: employer._id.toString(),
      },
    });

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

    employer.selectedPlan = plan;
    employer.paymentStatus = "pending";

    await employer.save();

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

    next(error);
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
      status,
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
      payment.status = "failed";
      payment.failureReason =
        "Flutterwave transaction verification failed";

      payment.transactionId =
        transaction_id.toString();

      await payment.save();

      return res.redirect(
        `${process.env.FRONTEND_URL}/employer/payment/cancelled`
      );
    }

    await activateEmployerPayment(
      payment,
      transaction
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/employer/payment/success`
    );
  } catch (error) {
    console.error(
      "Flutterwave employer callback error:",
      error.response?.data || error.message
    );

    next(error);
  }
};


// ACTIVATE EMPLOYER SUBSCRIPTION

export const activateEmployerPayment = async (
  payment,
  transaction
) => {
  const employer = await Employer.findById(
    payment.employer
  );

  if (!employer) {
    throw new Error("Employer not found");
  }

  const startDate = new Date();

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  payment.transactionId =
    transaction.id?.toString();

  payment.flwRef = transaction.flw_ref;

  payment.status = "successful";

  payment.paidAt = new Date();

  payment.metadata = {
    ...(payment.metadata || {}),
    flutterwaveStatus: transaction.status,
    paymentType: transaction.payment_type,
    chargedAmount: transaction.charged_amount,
  };

  await payment.save();

  await EmployerSubscription.findOneAndUpdate(
    {
      employer: employer._id,
    },
    {
      employer: employer._id,

      provider: "flutterwave",

      plan: payment.plan,

      status: "active",

      currentPeriodStart: startDate,

      currentPeriodEnd: endDate,

      cancelAtPeriodEnd: false,

      lastTransactionId:
        transaction.id?.toString(),

      lastTxRef: payment.txRef,
    },
    {
      upsert: true,
      new: true,
    }
  );

  employer.selectedPlan = payment.plan;

  employer.paymentStatus = "active";

  employer.planExpiresAt = endDate;

  employer.isTrial = false;

  await employer.save();
};



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
    next(error);
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
    const employerId = req.user._id;
    const { plan } = req.body;

    if (!plan || !["bronze", "silver", "platinum"].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employer plan",
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

    employer.selectedPlan = plan;
    employer.paymentStatus = "pending";

    await employer.save();

    return res.json({
      success: true,
      message: "Plan selected. Payment can be completed later.",
      plan,
      redirectUrl: `${process.env.FRONTEND_URL}/dashboard`,
    });
  } catch (error) {
    next(error);
  }
};