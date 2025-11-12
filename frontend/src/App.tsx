import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/common/ScrollToTop";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoutes from "./routes/AdminRoutes";
import StaffRoutes from "./routes/StaffRoutes";
import CoownerRoutes from "./routes/CoownerRoutes";
import { getDashboardPath } from "./utils/roles";

const RootRedirect: React.FC = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  if (token && role) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return <Navigate to="/signin" replace />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminRoutes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/*"
          element={
            <ProtectedRoute allowedRoles={["Staff", "Admin"]}>
              <StaffRoutes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coowner/*"
          element={
            <ProtectedRoute
              allowedRoles={["Co-owner", "CoOwner", "co-owner", "coowner"]}
            >
              <CoownerRoutes />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
