import RoleSidebar, { type SidebarSection } from "./RoleSidebar";
import {
  GridIcon,
  GroupIcon,
  PageIcon,
  UserCircleIcon,
  PieChartIcon,
  TaskIcon,
  LockIcon,
  CalenderIcon,
  DollarLineIcon,
  BoxCubeIcon,
} from "../../icons";

const sections: SidebarSection[] = [
  {
    title: "Admin Menu",
    links: [
      { label: "Dashboard", path: "/admin/dashboard", icon: <GridIcon /> },
      { label: "Manage Vehicles", path: "/admin/vehicles", icon: <BoxCubeIcon /> },
      { label: "Manage Groups", path: "/admin/groups", icon: <GroupIcon /> },
      { label: "Manage Bookings", path: "/admin/bookings", icon: <CalenderIcon /> },
      { label: "Manage Costs", path: "/admin/costs", icon: <DollarLineIcon /> },
      { label: "Manage Contracts", path: "/admin/contracts", icon: <PageIcon /> },
      { label: "Manage Staff", path: "/admin/staff", icon: <UserCircleIcon /> },
      { label: "Manage Users", path: "/admin/users", icon: <UserCircleIcon /> },
      { label: "Dispute Management", path: "/admin/disputes", icon: <TaskIcon /> },
      { label: "Reports", path: "/admin/reports", icon: <PieChartIcon /> },
      { label: "KYC Verification", path: "/admin/kyc-verification", icon: <LockIcon /> },
      { label: "Profile", path: "/admin/profile", icon: <UserCircleIcon /> },
    ],
  },
];

const AdminSidebar: React.FC = () => {
  return <RoleSidebar brandName="Admin Console" sections={sections} />;
};

export default AdminSidebar;
