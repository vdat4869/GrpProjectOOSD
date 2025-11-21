import { Navigate, Route, Routes } from "react-router-dom";
import StaffLayout from "../components/Layouts/StaffLayout";
import Dashboard from "../pages/staff/Dashboard";
import ManageVehicles from "../pages/staff/ManageVehicles";
import CheckInOut from "../pages/staff/CheckInOut";
import VehicleMaintenance from "../pages/staff/VehicleMaintenance";
import MonitorBookings from "../pages/staff/MonitorBookings";
import ManageContracts from "../pages/staff/ManageContracts";
import CostMonitoring from "../pages/staff/CostMonitoring";
import DisputeTracking from "../pages/staff/DisputeTracking";
import UserProfiles from "../pages/UserProfiles";
import KycPage from "../pages/KYC/KycPage";

const StaffRoutes: React.FC = () => {
  return (
    <StaffLayout>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vehicles" element={<ManageVehicles />} />
        <Route path="check-in-out" element={<CheckInOut />} />
        <Route path="maintenance" element={<VehicleMaintenance />} />
        <Route path="bookings" element={<MonitorBookings />} />
        <Route path="contracts" element={<ManageContracts />} />
        <Route path="costs" element={<CostMonitoring />} />
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
