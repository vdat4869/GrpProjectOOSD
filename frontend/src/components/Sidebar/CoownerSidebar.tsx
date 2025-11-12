import RoleSidebar, { type SidebarSection } from "./RoleSidebar";
import {
  GridIcon,
  CalenderIcon,
  DollarLineIcon,
  UserCircleIcon,
  TaskIcon,
  PieChartIcon,
} from "../../icons";

const sections: SidebarSection[] = [
  {
    title: "Co-owner Menu",
    links: [
      { label: "Dashboard", path: "/coowner/dashboard", icon: <GridIcon /> },
      { label: "My Bookings", path: "/coowner/bookings", icon: <CalenderIcon /> },
      { label: "Payment History", path: "/coowner/payments", icon: <DollarLineIcon /> },
      { label: "Ownership Details", path: "/coowner/ownership", icon: <UserCircleIcon /> },
      { label: "Group Voting", path: "/coowner/voting", icon: <TaskIcon /> },
      { label: "Usage Analytics", path: "/coowner/analytics", icon: <PieChartIcon /> },
    ],
  },
];

const CoownerSidebar: React.FC = () => {
  return <RoleSidebar brandName="Co-owner Hub" sections={sections} />;
};

export default CoownerSidebar;
