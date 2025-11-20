import { Navigate, Route, Routes } from "react-router-dom";
import StaffLayout from "../components/Layouts/StaffLayout";
import Dashboard from "../pages/staff/Dashboard";
import CheckInOut from "../pages/staff/CheckInOut";
import VehicleMaintenance from "../pages/staff/VehicleMaintenance";
import MonitorBookings from "../pages/staff/MonitorBookings";
import DisputeTracking from "../pages/staff/DisputeTracking";
import UserProfiles from "../pages/UserProfiles";
import KycPage from "../pages/KYC/KycPage";

const StaffRoutes: React.FC = () => {
  return (
    <StaffLayout>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="check-in-out" element={<CheckInOut />} />
        <Route path="maintenance" element={<VehicleMaintenance />} />
        <Route path="bookings" element={<MonitorBookings />} />
        <Route path="disputes" element={<DisputeTracking />} />
        <Route path="profile" element={<UserProfiles />} />
        <Route path="kyc" element={<KycPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </StaffLayout>
  );
};

export default StaffRoutes;
