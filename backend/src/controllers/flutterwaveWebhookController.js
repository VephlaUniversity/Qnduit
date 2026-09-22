import flutterwave from "../utils/flutterwave.js";

import TalentPayment from "../models/TalentPayment.js";
import EmployerPayment from "../models/EmployerPayment.js";

import {
  activateTalentPayment,
  activateEmployerPayment,
} from "./paymentController.js";

export const handleFlutterwaveWebhook = async (
  req,
  res
) => {
  try {
    const signature =
      req.headers["verif-hash"];

    if (
      !signature ||
      signature !==
        process.env.FLW_SECRET_HASH
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid webhook signature",
      });
    }

    const event = req.body;

    const data = event?.data;

    if (!data?.id) {
      return res.status(200).json({
        received: true,
      });
    }

    // ==========================================
    // SUCCESSFUL / FAILED CHARGE
    // ==========================================

    if (
      event.event ===
        "charge.completed" ||
      event.type ===
        "charge.completed"
    ) {
      const transactionId =
        data.id;

      const response =
        await flutterwave.get(
          `/transactions/${transactionId}/verify`
        );

      const transaction =
        response.data?.data;

      if (!transaction) {
        return res.status(200).json({
          received: true,
        });
      }

      const txRef =
        transaction.tx_ref;

      // ==========================================
      // TALENT PAYMENT
      // ==========================================

      const talentPayment =
        await TalentPayment.findOne({
          txRef,
        });

      if (talentPayment) {
        if (
          transaction.status ===
          "successful"
        ) {
          if (
            talentPayment.status !==
            "successful"
          ) {
            await activateTalentPayment(
              talentPayment,
              transaction
            );
          }
        } else {
          talentPayment.status =
            "failed";

          talentPayment.failureReason =
            "Flutterwave payment failed";

          await talentPayment.save();
        }

        return res.status(200).json({
          received: true,
        });
      }

      // ==========================================
      // EMPLOYER PAYMENT
      // ==========================================

      const employerPayment =
        await EmployerPayment.findOne({
          txRef,
        });

      if (employerPayment) {
        if (
          transaction.status ===
          "successful"
        ) {
          if (
            employerPayment.status !==
            "successful"
          ) {
            await activateEmployerPayment(
              employerPayment,
              transaction
            );
          }
        } else {
          employerPayment.status =
            "failed";

          employerPayment.failureReason =
            "Flutterwave payment failed";

          await employerPayment.save();
        }

        return res.status(200).json({
          received: true,
        });
      }
    }

    // ==========================================
    // SUBSCRIPTION CANCELLED
    // ==========================================

    if (
      event.event ===
        "subscription.cancelled" ||
      event.type ===
        "subscription.cancelled"
    ) {
      const customerEmail =
        data.customer?.email;

      if (!customerEmail) {
        return res.status(200).json({
          received: true,
        });
      }

      // Handle Talent subscription
      const Talent =
        (
          await import(
            "../models/Talent.js"
          )
        ).default;

      const talent =
        await Talent.findOne({
          email:
            customerEmail.toLowerCase(),
        });

      if (talent) {
        const subscription =
          await import(
            "../models/TalentSubscription.js"
          );

        const TalentSubscription =
          subscription.default;

        await TalentSubscription.findOneAndUpdate(
          {
            talent:
              talent._id,
          },
          {
            status:
              "canceled",
            endedAt:
              new Date(),
          }
        );

        talent.paymentStatus =
          "cancelled";

        await talent.save();
      }

      return res.status(200).json({
        received: true,
      });
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Flutterwave webhook error:",
      error.response?.data ||
        error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Webhook processing failed",
    });
  }
};