import RoleSidebar, { type SidebarSection } from "./RoleSidebar";
import {
  GridIcon,
  GroupIcon,
  PageIcon,
  UserCircleIcon,
  PieChartIcon,
  TaskIcon,
} from "../../icons";

const sections: SidebarSection[] = [
  {
    title: "Admin Menu",
    links: [
      { label: "Dashboard", path: "/admin/dashboard", icon: <GridIcon /> },
      { label: "Manage Groups", path: "/admin/groups", icon: <GroupIcon /> },
      { label: "Manage Contracts", path: "/admin/contracts", icon: <PageIcon /> },
      { label: "Manage Staff", path: "/admin/staff", icon: <UserCircleIcon /> },
      { label: "Dispute Management", path: "/admin/disputes", icon: <TaskIcon /> },
      { label: "Reports", path: "/admin/reports", icon: <PieChartIcon /> },
    ],
  },
];

const AdminSidebar: React.FC = () => {
  return <RoleSidebar brandName="Admin Console" sections={sections} />;
};

export default AdminSidebar;
