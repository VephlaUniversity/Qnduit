// Badge decisions are independent of email confirmation, access and payment.
// Null/absent means no admin decision; it never falls back to another flag.
export const verificationBadgeDTO = account => ({
  hasVerificationBadge: account?.verificationBadgeOverride === true,
});

export function withVerificationBadge(account) {
  const item = account.toObject ? account.toObject() : { ...account };
  const dto = verificationBadgeDTO(item);
  delete item.verificationBadgeOverride;
  delete item.verificationBadgeDecidedBy;
  delete item.verificationBadgeDecidedAt;
  return { ...item, ...dto };
}
