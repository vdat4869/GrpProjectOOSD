import RoleSidebar, { type SidebarSection } from "./RoleSidebar";
import {
  GridIcon,
  TimeIcon,
  BoxCubeIcon,
  CalenderIcon,
  TaskIcon,
  LockIcon,
  UserCircleIcon,
} from "../../icons";

const sections: SidebarSection[] = [
  {
    title: "Staff Menu",
    links: [
      { label: "Dashboard", path: "/staff/dashboard", icon: <GridIcon /> },
      { label: "Check-In / Check-Out", path: "/staff/check-in-out", icon: <TimeIcon /> },
      { label: "Vehicle Maintenance", path: "/staff/maintenance", icon: <BoxCubeIcon /> },
      { label: "Monitor Bookings", path: "/staff/bookings", icon: <CalenderIcon /> },
      { label: "Dispute Tracking", path: "/staff/disputes", icon: <TaskIcon /> },
      { label: "KYC Verification", path: "/staff/kyc", icon: <LockIcon /> },
      { label: "Profile", path: "/staff/profile", icon: <UserCircleIcon /> },
    ],
  },
];

const StaffSidebar: React.FC = () => {
  return <RoleSidebar brandName="Staff Console" sections={sections} />;
};

export default StaffSidebar;
