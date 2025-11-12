export const normalizeRole = (role: string | null): string | null => {
  if (!role) return null;
  return role.replace(/\s+/g, "-").toLowerCase();
};

export const getDashboardPath = (role: string | null): string => {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case "admin":
      return "/admin/dashboard";
    case "staff":
      return "/staff/dashboard";
    case "co-owner":
    case "coowner":
      return "/coowner/dashboard";
    default:
      return "/signin";
  }
};

export const isCoOwnerRole = (role: string | null): boolean => {
  const normalized = normalizeRole(role);
  return normalized === "co-owner" || normalized === "coowner";
};
