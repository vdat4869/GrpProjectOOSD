import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../components/Layouts/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import ManageVehicles from "../pages/admin/ManageVehicles";
import ManageGroups from "../pages/admin/ManageGroups";
import ManageBookings from "../pages/admin/ManageBookings";
import ManageCosts from "../pages/admin/ManageCosts";
import ManageContracts from "../pages/admin/ManageContracts";
import ManageStaff from "../pages/admin/ManageStaff";
import ManageUsers from "../pages/admin/ManageUsers";
import DisputeManagement from "../pages/admin/DisputeManagement";
import Reports from "../pages/admin/Reports";
import UserProfiles from "../pages/UserProfiles";
import KycPage from "../pages/KYC/KycPage";
import KycVerification from "../pages/admin/KycVerification";

const AdminRoutes: React.FC = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vehicles" element={<ManageVehicles />} />
        <Route path="groups" element={<ManageGroups />} />
        <Route path="bookings" element={<ManageBookings />} />
        <Route path="costs" element={<ManageCosts />} />
        <Route path="contracts" element={<ManageContracts />} />
        <Route path="staff" element={<ManageStaff />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="disputes" element={<DisputeManagement />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<UserProfiles />} />
        <Route path="kyc" element={<KycPage />} />
        <Route path="kyc-verification" element={<KycVerification />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminRoutes;
