export const APPROVED_ADMIN_GOOGLE_ID = "118271302696111351988";

export function isApprovedAdminAccount(accountId: string | null | undefined) {
  return accountId === APPROVED_ADMIN_GOOGLE_ID;
}
