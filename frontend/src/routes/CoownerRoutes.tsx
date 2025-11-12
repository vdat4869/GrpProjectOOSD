import { Navigate, Route, Routes } from "react-router-dom";
import CoownerLayout from "../components/Layouts/CoownerLayout";
import Dashboard from "../pages/coowner/Dashboard";
import MyBookings from "../pages/coowner/MyBookings";
import PaymentHistory from "../pages/coowner/PaymentHistory";
import OwnershipDetails from "../pages/coowner/OwnershipDetails";
import GroupVoting from "../pages/coowner/GroupVoting";
import UsageAnalytics from "../pages/coowner/UsageAnalytics";

const CoownerRoutes: React.FC = () => {
  return (
    <CoownerLayout>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="payments" element={<PaymentHistory />} />
        <Route path="ownership" element={<OwnershipDetails />} />
        <Route path="voting" element={<GroupVoting />} />
        <Route path="analytics" element={<UsageAnalytics />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </CoownerLayout>
  );
};

export default CoownerRoutes;
