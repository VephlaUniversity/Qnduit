import stripe from "../utils/stripe.js";
import Talent from "../models/Talent.js";
import TalentSubscription from "../models/TalentSubscription.js";
import Payment from "../models/TalentPayment.js";

export const handleStripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error.message
    );

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    );
  }

  try {
    switch (event.type) {
      // ==========================================
      // CHECKOUT COMPLETED
      // ==========================================

      case "checkout.session.completed": {
        const session = event.data.object;

        const talentId =
          session.metadata?.talentId ||
          session.client_reference_id;

        if (!talentId) break;

        const talent = await Talent.findById(talentId);

        if (!talent) break;

        if (session.customer) {
          talent.stripeCustomerId =
            session.customer.toString();
        }

        talent.selectedPlan =
          session.metadata?.plan || "public";

        await talent.save();

        // Save subscription ID if available

        if (session.subscription) {
          const stripeSubscription =
            await stripe.subscriptions.retrieve(
              session.subscription
            );

          await TalentSubscription.findOneAndUpdate(
            {
              talent: talent._id,
            },
            {
              talent: talent._id,
              provider: "stripe",
              stripeCustomerId:
                session.customer.toString(),
              stripeSubscriptionId:
                stripeSubscription.id,
              plan:
                session.metadata?.plan || "public",
              status:
                stripeSubscription.status,
              currentPeriodStart:
                new Date(
                  stripeSubscription.current_period_start *
                    1000
                ),
              currentPeriodEnd:
                new Date(
                  stripeSubscription.current_period_end *
                    1000
                ),
              cancelAtPeriodEnd:
                stripeSubscription.cancel_at_period_end,
            },
            {
              upsert: true,
              new: true,
            }
          );
        }

        break;
      }

      // ==========================================
      // PAYMENT SUCCESSFUL
      // ==========================================

      case "invoice.paid": {
        const invoice = event.data.object;

        const subscriptionId =
          invoice.subscription?.toString();

        if (!subscriptionId) break;

        const subscription =
          await TalentSubscription.findOne({
            stripeSubscriptionId: subscriptionId,
          });

        if (!subscription) break;

        await Payment.findOneAndUpdate(
          {
            stripeInvoiceId: invoice.id,
          },
          {
            talent: subscription.talent,
            provider: "stripe",
            stripeInvoiceId: invoice.id,
            stripePaymentIntentId:
              invoice.payment_intent?.toString(),
            stripeSubscriptionId: subscriptionId,
            amount:
              invoice.amount_paid || 0,
            currency:
              invoice.currency || "usd",
            plan: subscription.plan,
            type: "subscription_renewal",
            status: "successful",
            paidAt: new Date(
              (invoice.status_transitions?.paid_at ||
                Math.floor(Date.now() / 1000)) * 1000
            ),
          },
          {
            upsert: true,
            new: true,
          }
        );

        subscription.status = "active";

        if (invoice.period_start) {
          subscription.currentPeriodStart =
            new Date(invoice.period_start * 1000);
        }

        if (invoice.period_end) {
          subscription.currentPeriodEnd =
            new Date(invoice.period_end * 1000);
        }

        await subscription.save();

        await Talent.findByIdAndUpdate(
          subscription.talent,
          {
            paymentStatus: "active",
          }
        );

        break;
      }

      // ==========================================
      // PAYMENT FAILED
      // ==========================================

      case "invoice.payment_failed": {
        const invoice = event.data.object;

        const subscriptionId =
          invoice.subscription?.toString();

        if (!subscriptionId) break;

        const subscription =
          await TalentSubscription.findOne({
            stripeSubscriptionId: subscriptionId,
          });

        if (!subscription) break;

        subscription.status = "past_due";

        await subscription.save();

        await Payment.findOneAndUpdate(
          {
            stripeInvoiceId: invoice.id,
          },
          {
            talent: subscription.talent,
            provider: "stripe",
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId,
            amount:
              invoice.amount_due || 0,
            currency:
              invoice.currency || "usd",
            plan: subscription.plan,
            type: "subscription_renewal",
            status: "failed",
            failureReason:
              "Stripe payment failed",
          },
          {
            upsert: true,
            new: true,
          }
        );

        await Talent.findByIdAndUpdate(
          subscription.talent,
          {
            paymentStatus: "past_due",
          }
        );

        break;
      }

      // ==========================================
      // SUBSCRIPTION UPDATED
      // ==========================================

      case "customer.subscription.updated": {
        const stripeSubscription =
          event.data.object;

        const subscription =
          await TalentSubscription.findOne({
            stripeSubscriptionId:
              stripeSubscription.id,
          });

        if (!subscription) break;

        subscription.status =
          stripeSubscription.status;

        subscription.cancelAtPeriodEnd =
          stripeSubscription.cancel_at_period_end;

        subscription.currentPeriodStart =
          new Date(
            stripeSubscription.current_period_start *
              1000
          );

        subscription.currentPeriodEnd =
          new Date(
            stripeSubscription.current_period_end *
              1000
          );

        if (
          stripeSubscription.cancel_at_period_end
        ) {
          subscription.canceledAt =
            subscription.canceledAt ||
            new Date();
        }

        await subscription.save();

        let paymentStatus = "active";

        if (
          stripeSubscription.status === "past_due"
        ) {
          paymentStatus = "past_due";
        }

        if (
          stripeSubscription.status === "canceled"
        ) {
          paymentStatus = "cancelled";
        }

        if (
          stripeSubscription.status === "unpaid"
        ) {
          paymentStatus = "expired";
        }

        await Talent.findByIdAndUpdate(
          subscription.talent,
          {
            paymentStatus,
          }
        );

        break;
      }

      // ==========================================
      // SUBSCRIPTION DELETED
      // ==========================================

      case "customer.subscription.deleted": {
        const stripeSubscription =
          event.data.object;

        const subscription =
          await TalentSubscription.findOne({
            stripeSubscriptionId:
              stripeSubscription.id,
          });

        if (!subscription) break;

        subscription.status = "canceled";
        subscription.endedAt = new Date();

        await subscription.save();

        await Talent.findByIdAndUpdate(
          subscription.talent,
          {
            paymentStatus: "cancelled",
          }
        );

        break;
      }

      default:
        console.log(
          `Unhandled Stripe event: ${event.type}`
        );
    }

    return res.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};