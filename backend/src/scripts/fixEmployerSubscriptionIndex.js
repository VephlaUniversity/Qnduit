
import mongoose from "mongoose";

export async function fixEmployerSubscriptionIndex() {
  const collection = mongoose.connection.collection(
    "employersubscriptions"
  );

  const indexes = await collection.indexes();

  const obsoleteIndex = indexes.find(
    (index) => index.name === "stripeSubscriptionId_1"
  );

  if (obsoleteIndex) {
    await collection.dropIndex("stripeSubscriptionId_1");
    console.log("Removed obsolete Stripe subscription index.");
  } else {
    console.log("Obsolete Stripe index does not exist.");
  }
}
