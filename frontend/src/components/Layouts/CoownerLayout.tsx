import type { PropsWithChildren } from "react";
import RoleLayout from "./RoleLayout";
import CoownerSidebar from "../Sidebar/CoownerSidebar";

const CoownerLayout: React.FC<PropsWithChildren> = ({ children }) => {
  return <RoleLayout SidebarComponent={CoownerSidebar}>{children}</RoleLayout>;
};

export default CoownerLayout;
