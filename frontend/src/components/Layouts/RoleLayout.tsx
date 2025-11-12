import type { ComponentType, PropsWithChildren } from "react";
import { SidebarProvider, useSidebar } from "../../context/SidebarContext";
import AppHeader from "../../layout/AppHeader";
import Backdrop from "../../layout/Backdrop";

interface RoleLayoutProps extends PropsWithChildren {
  SidebarComponent: ComponentType;
}

const LayoutShell: React.FC<RoleLayoutProps> = ({ SidebarComponent, children }) => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <SidebarComponent />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
};

const RoleLayout: React.FC<RoleLayoutProps> = ({ SidebarComponent, children }) => {
  return (
    <SidebarProvider>
      <LayoutShell SidebarComponent={SidebarComponent}>{children}</LayoutShell>
    </SidebarProvider>
  );
};

export default RoleLayout;
