import type { PropsWithChildren } from "react";
import RoleLayout from "./RoleLayout";
import StaffSidebar from "../Sidebar/StaffSidebar";

const StaffLayout: React.FC<PropsWithChildren> = ({ children }) => {
  return <RoleLayout SidebarComponent={StaffSidebar}>{children}</RoleLayout>;
};

export default StaffLayout;
