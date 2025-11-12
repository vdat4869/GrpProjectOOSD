import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { normalizeRole } from "../utils/roles";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const location = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const normalizedRole = normalizeRole(role);
  const normalizedAllowed = allowedRoles.map((item) => normalizeRole(item));

  if (!token || !normalizedRole || !normalizedAllowed.includes(normalizedRole)) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
