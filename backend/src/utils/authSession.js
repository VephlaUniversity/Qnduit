// Shared, explicit identity projection for login and completed email verification.
export const authIdentity = (account, userType) => ({
  id: account._id,
  email: account.email,
  firstName: account.firstName,
  lastName: account.lastName,
  userType,
});
