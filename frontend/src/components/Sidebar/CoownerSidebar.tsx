import RoleSidebar, { type SidebarSection } from "./RoleSidebar";
import {
  GridIcon,
  CalenderIcon,
  DollarLineIcon,
  UserCircleIcon,
  TaskIcon,
  PieChartIcon,
  LockIcon,
} from "../../icons";

const sections: SidebarSection[] = [
  {
    title: "Co-owner Menu",
    links: [
      { label: "Dashboard", path: "/coowner/dashboard", icon: <GridIcon /> },
      { label: "My Bookings", path: "/coowner/bookings", icon: <CalenderIcon /> },
      { label: "Payment History", path: "/coowner/payments", icon: <DollarLineIcon /> },
      { label: "Cost Shares", path: "/coowner/cost-shares", icon: <DollarLineIcon /> },
      { label: "Common Fund", path: "/coowner/common-fund", icon: <DollarLineIcon /> },
      { label: "Ownership Details", path: "/coowner/ownership", icon: <UserCircleIcon /> },
      { label: "Group Voting", path: "/coowner/voting", icon: <TaskIcon /> },
      { label: "Usage Analytics", path: "/coowner/analytics", icon: <PieChartIcon /> },
      { label: "KYC Verification", path: "/coowner/kyc", icon: <LockIcon /> },
      { label: "Profile", path: "/coowner/profile", icon: <UserCircleIcon /> },
    ],
  },
];

const CoownerSidebar: React.FC = () => {
  return <RoleSidebar brandName="Co-owner Hub" sections={sections} />;
};

export default CoownerSidebar;
