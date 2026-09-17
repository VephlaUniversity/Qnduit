import stripe from "../utils/stripe.js";
import Talent from "../models/Talent.js";
import TalentSubscription from "../models/TalentSubscription.js";
import TalentPayment from "../models/TalentPayment.js";
import Employer from "../models/Employer.js";
import EmployerSubscription from "../models/EmployerSubscription.js";
import EmployerPayment from "../models/EmployerPayment.js";


const PLAN_PRICES = {
  public: process.env.STRIPE_PUBLIC_PLAN_PRICE_ID,
  bronze: process.env.STRIPE_EMPLOYER_BRONZE_PRICE_ID,
  silver: process.env.STRIPE_EMPLOYER_SILVER_PRICE_ID,
  platinum: process.env.STRIPE_EMPLOYER_PLATINUM_PRICE_ID
};

// CREATE TALENT SESSION
export const createCheckoutSession = async (req, res, next) => {
  try {
    const talentId = req.user._id;
    const { plan } = req.body;

    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment plan",
      });
    }

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

    // FREE PLAN

    if (plan === "free") {
      talent.selectedPlan = "free";
      talent.paymentStatus = "none";

      await talent.save();

      return res.json({
        success: true,
        free: true,
        redirectUrl: `${process.env.FRONTEND_URL}/dashboard`,
      });
    }

    // EXISTING ACTIVE SUBSCRIPTION

    const existingSubscription = await TalentSubscription.findOne({
      talent: talent._id,
      status: {
        $in: ["active", "trialing", "past_due"],
      },
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: "You already have an active subscription",
      });
    }

    // STRIPE CUSTOMER

    let customerId = talent.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: talent.email,
        name:
          talent.fullName ||
          `${talent.firstName || ""} ${talent.lastName || ""}`.trim(),
        metadata: {
          talentId: talent._id.toString(),
        },
      });

      customerId = customer.id;

      talent.stripeCustomerId = customerId;
      await talent.save();
    }

    // CREATE CHECKOUT SESSION

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer: customerId,

      line_items: [
        {
          price: PLAN_PRICES[plan],
          quantity: 1,
        },
      ],

      success_url:
        `${process.env.FRONTEND_URL}/payment/success` +
        `?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${process.env.FRONTEND_URL}/payment/cancelled`,

      client_reference_id: talent._id.toString(),

      metadata: {
        talentId: talent._id.toString(),
        plan,
      },

      subscription_data: {
        metadata: {
          talentId: talent._id.toString(),
          plan,
        },
      },

      allow_promotion_codes: true,
    });

    talent.selectedPlan = plan;
    talent.paymentStatus = "pending";

    await talent.save();

    // Create pending transaction record

    await TalentPayment.create({
      talent: talent._id,
      provider: "stripe",
      stripeCheckoutSessionId: session.id,
      amount: 199,
      currency: "usd",
      plan,
      type: "subscription",
      status: "pending",
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    next(error);
  }
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

// Cancel Talent Subscription
export const cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await TalentSubscription.findOne({
      talent: req.user._id,
      status: {
        $in: ["active", "trialing", "past_due"],
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

    res.json({
      success: true,
      message:
        "Subscription will be cancelled at the end of the current billing period",
      subscription: updatedSubscription,
    });
  } catch (error) {
    next(error);
  }
};

// Un-cancel Talent Subscription
export const resumeSubscription = async (req, res, next) => {
  try {
    const subscription = await TalentSubscription.findOne({
      talent: req.user._id,
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

    res.json({
      success: true,
      message: "Subscription cancellation has been reversed",
      subscription: updatedSubscription,
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

    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment plan",
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

    // FREE PLAN
    if (plan === "free") {
      employer.selectedPlan = "free";
      employer.paymentStatus = "none";

      await employer.save();

      return res.json({
        success: true,
        free: true,
        redirectUrl:
          `${process.env.FRONTEND_URL}/employer-dashboard`,
      });
    }

    // EXISTING ACTIVE SUBSCRIPTION
    const existingSubscription =
      await EmployerSubscription.findOne({
        employer: employer._id,
        status: {
          $in: [
            "active",
            "trialing",
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

    // STRIPE CUSTOMER

    let customerId = employer.stripeCustomerId;

    if (!customerId) {
      const customer =
        await stripe.customers.create({
          email: employer.email,

          name:
            employer.displayName ||
            `${employer.firstName || ""} ${
              employer.lastName || ""
            }`.trim(),

          metadata: {
            employerId:
              employer._id.toString(),
          },
        });

      customerId = customer.id;

      employer.stripeCustomerId =
        customerId;

      await employer.save();
    }

    // CREATE CHECKOUT SESSION

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        customer: customerId,

        line_items: [
          {
            price: PLAN_PRICES[plan],
            quantity: 1,
          },
        ],

        success_url:
          `${process.env.FRONTEND_URL}/employer/payment/success` +
          `?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${process.env.FRONTEND_URL}/employer/payment/cancelled`,

        client_reference_id:
          employer._id.toString(),

        metadata: {
          employerId:
            employer._id.toString(),
          plan,
        },

        subscription_data: {
          metadata: {
            employerId:
              employer._id.toString(),
            plan,
          },
        },

        allow_promotion_codes: true,
      });

    employer.selectedPlan = plan;
    employer.paymentStatus = "pending";

    await employer.save();

    // CREATE PENDING PAYMENT

    await EmployerPayment.create({
      employer: employer._id,
      provider: "stripe",
      stripeCheckoutSessionId: session.id,
      amount: 199,
      currency: "usd",
      plan,
      type: "subscription",
      status: "pending",
    });

    return res.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    next(error);
  }
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

export const cancelEmployerSubscription = async (
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
};

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
      redirectUrl: `${process.env.FRONTEND_URL}/employer-dashboard`,
    });
  } catch (error) {
    next(error);
  }
};