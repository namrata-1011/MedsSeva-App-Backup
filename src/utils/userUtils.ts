/**
 * Robust helper to check whether a phlebotomist user is an In-House Employee / Staff
 * or a Freelance Collection Partner (30% commission).
 */
export const isPhlebotomistEmployee = (user: any): boolean => {
  if (!user) return false;

  // If explicitly flagged as freelancer, respect that flag
  if (user.userType === 'FREELANCER' || user.phlebotomistType === 'FREELANCER') {
    return false;
  }

  // Check all signals of being an in-house employee / staff:
  return Boolean(
    user.isEmployee === true ||
    user.phlebotomistType === 'EMPLOYEE' ||
    user.userType === 'STAFF' ||
    user.userType === 'EMPLOYEE' ||
    Boolean(user.branchId) ||
    Boolean(user.partner?.branchId) ||
    (user.partner && user.partner.commissionRate === 0) ||
    Boolean(user.adminUser) ||
    (typeof user.designation === 'string' && /phlebotomist|collector|phlebo|staff|employee/i.test(user.designation)) ||
    (typeof user.department === 'string' && /pathology|phlebotom|lab/i.test(user.department))
  );
};
