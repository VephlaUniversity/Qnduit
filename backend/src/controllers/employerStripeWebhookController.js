import flutterwave from "../utils/flutterwave.js";
import Employer from "../models/Employer.js";
import EmployerSubscription from "../models/EmployerSubscription.js";
import EmployerPayment from "../models/EmployerPayment.js";

export const handleEmployerFlutterwaveWebhook = async (
  req,
  res
) => {
  try {
    const signature =
      req.headers["verif-hash"];

    if (
      !signature ||
      signature !== process.env.FLW_SECRET_HASH
    ) {
      return res.status(401).end();
    }

    const payload = req.body;

    console.log(
      "Flutterwave employer webhook:",
      payload
    );

    const transactionId =
      payload?.data?.id;

    const txRef =
      payload?.data?.tx_ref;

    if (!transactionId || !txRef) {
      return res.status(200).end();
    }

    const payment = await EmployerPayment.findOne({
      txRef,
    });

    if (!payment) {
      return res.status(200).end();
    }

    // Idempotency
    if (payment.status === "successful") {
      return res.status(200).end();
    }

    // Verify directly with Flutterwave
    const response = await flutterwave.get(
      `/transactions/${transactionId}/verify`
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
        "Webhook transaction verification failed";

      await payment.save();

      return res.status(200).end();
    }

    await activateEmployerPayment(
      payment,
      transaction
    );

    return res.status(200).end();
  } catch (error) {
    console.error(
      "Flutterwave employer webhook error:",
      error.response?.data || error.message
    );

    return res.status(500).end();
  }
};