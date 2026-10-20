import mongoose from "mongoose";

export async function fixSubscriptionIndexes() {
  const collections = [
    "talentsubscriptions",
    "employersubscriptions",
  ];

  for (const collectionName of collections) {
    const collection =
      mongoose.connection.collection(collectionName);

    const indexes = await collection.indexes();

    const obsoleteIndex = indexes.find(
      (index) => index.name === "stripeSubscriptionId_1"
    );

    if (obsoleteIndex) {
      await collection.dropIndex("stripeSubscriptionId_1");

      console.log(
        `Removed obsolete Stripe index from ${collectionName}.`
      );
    } else {
      console.log(
        `No obsolete Stripe index found in ${collectionName}.`
      );
    }
  }
}