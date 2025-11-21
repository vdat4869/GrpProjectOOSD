import { Navigate, Route, Routes } from "react-router-dom";
import CoownerLayout from "../components/Layouts/CoownerLayout";
import Dashboard from "../pages/coowner/Dashboard";
import MyBookings from "../pages/coowner/MyBookings";
import PaymentHistory from "../pages/coowner/PaymentHistory";
import CostShares from "../pages/coowner/CostShares";
import CompanyPayment from "../pages/coowner/CompanyPayment";
import CommonFund from "../pages/coowner/CommonFund";
import OwnershipDetails from "../pages/coowner/OwnershipDetails";
import GroupVoting from "../pages/coowner/GroupVoting";
import UsageAnalytics from "../pages/coowner/UsageAnalytics";
import KycPage from "../pages/KYC/KycPage";
import UserProfiles from "../pages/UserProfiles";

const CoownerRoutes: React.FC = () => {
  return (
    <CoownerLayout>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="payments" element={<PaymentHistory />} />
        <Route path="cost-shares" element={<CostShares />} />
        <Route path="company-payment" element={<CompanyPayment />} />
        <Route path="common-fund" element={<CommonFund />} />
        <Route path="ownership" element={<OwnershipDetails />} />
        <Route path="voting" element={<GroupVoting />} />
        <Route path="analytics" element={<UsageAnalytics />} />
        <Route path="kyc" element={<KycPage />} />
        <Route path="profile" element={<UserProfiles />} />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </CoownerLayout>
  );
};

export default CoownerRoutes;
