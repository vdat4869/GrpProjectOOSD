import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { HorizontaLDots } from "../../icons";

export interface SidebarLink {
  label: string;
  path: string;
  icon?: ReactNode;
}

export interface SidebarSection {
  title?: string;
  links: SidebarLink[];
}

interface RoleSidebarProps {
  brandHref?: string;
  brandName?: string;
  sections: SidebarSection[];
}

const RoleSidebar: React.FC<RoleSidebarProps> = ({
  brandHref = "/",
  brandName = "TailAdmin EV",
  sections,
}) => {
  const { isExpanded, isHovered, isMobileOpen, setIsHovered } = useSidebar();

  const isWide = isExpanded || isHovered || isMobileOpen;

  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10"
    }`;

  const iconClassName = ({ isActive }: { isActive: boolean }) =>
    `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg transition-colors duration-200 ${
      isActive
        ? "border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200"
        : "border-gray-200 bg-white text-gray-500 group-hover:border-gray-300 group-hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:group-hover:text-gray-300"
    }`;

  return (
    <aside
      className={`fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-5 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0 ${
        isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
          ? "w-[290px]"
          : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex items-center ${isWide ? "justify-start" : "lg:justify-center"} py-8`}
      >
        <a href={brandHref} className="flex items-center gap-2">
          {isWide ? (
            <span className="text-lg font-semibold text-gray-900 dark:text-white/90">
              {brandName}
            </span>
          ) : (
            <img
              src="/images/logo/logo-icon.svg"
              alt="TailAdmin"
              width={32}
              height={32}
            />
          )}
        </a>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto pb-10">
        {sections.map((section, sectionIndex) => (
          <div key={section.title ?? sectionIndex} className="mb-6">
            <div
              className={`mb-4 flex items-center text-xs uppercase tracking-wide text-gray-400 ${
                isWide ? "justify-start" : "lg:justify-center"
              }`}
            >
              {isWide ? section.title ?? "Menu" : <HorizontaLDots className="size-6" />}
            </div>

            <nav className="flex flex-col gap-2">
              {section.links.map((link) => (
                <NavLink key={link.path} to={link.path} className={linkClassName} end>
                  {({ isActive }) => (
                    <>
                      <span className={iconClassName({ isActive })}>
                        {link.icon ?? <span className="text-base">•</span>}
                      </span>
                      {isWide ? <span>{link.label}</span> : null}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default RoleSidebar;
