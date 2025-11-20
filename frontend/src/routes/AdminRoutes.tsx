import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../components/Layouts/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import ManageGroups from "../pages/admin/ManageGroups";
import ManageContracts from "../pages/admin/ManageContracts";
import ManageStaff from "../pages/admin/ManageStaff";
import DisputeManagement from "../pages/admin/DisputeManagement";
import Reports from "../pages/admin/Reports";
import UserProfiles from "../pages/UserProfiles";
import KycPage from "../pages/KYC/KycPage";

const AdminRoutes: React.FC = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="groups" element={<ManageGroups />} />
        <Route path="contracts" element={<ManageContracts />} />
        <Route path="staff" element={<ManageStaff />} />
        <Route path="disputes" element={<DisputeManagement />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<UserProfiles />} />
        <Route path="kyc" element={<KycPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminRoutes;
