import type { PropsWithChildren } from "react";
import RoleLayout from "./RoleLayout";
import AdminSidebar from "../Sidebar/AdminSidebar";

const AdminLayout: React.FC<PropsWithChildren> = ({ children }) => {
  return <RoleLayout SidebarComponent={AdminSidebar}>{children}</RoleLayout>;
};

export default AdminLayout;
