import RoleSidebar, { type SidebarSection } from "./RoleSidebar";
import {
  GridIcon,
  TimeIcon,
  BoxCubeIcon,
  CalenderIcon,
  TaskIcon,
  UserCircleIcon,
  PageIcon,
  DollarLineIcon,
} from "../../icons";

const sections: SidebarSection[] = [
  {
    title: "Staff Menu",
    links: [
      { label: "Dashboard", path: "/staff/dashboard", icon: <GridIcon /> },
      { label: "Manage Vehicles", path: "/staff/vehicles", icon: <BoxCubeIcon /> },
      { label: "Check-In / Check-Out", path: "/staff/check-in-out", icon: <TimeIcon /> },
      { label: "Vehicle Maintenance", path: "/staff/maintenance", icon: <BoxCubeIcon /> },
      { label: "Monitor Bookings", path: "/staff/bookings", icon: <CalenderIcon /> },
      { label: "Manage Contracts", path: "/staff/contracts", icon: <PageIcon /> },
      { label: "Cost Monitoring", path: "/staff/costs", icon: <DollarLineIcon /> },
      { label: "Dispute Tracking", path: "/staff/disputes", icon: <TaskIcon /> },
      { label: "Profile", path: "/staff/profile", icon: <UserCircleIcon /> },
    ],
  },
];

const StaffSidebar: React.FC = () => {
  return <RoleSidebar brandName="Staff Console" sections={sections} />;
};

export default StaffSidebar;
