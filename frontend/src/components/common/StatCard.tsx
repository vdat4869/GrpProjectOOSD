import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon?: ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, icon }) => {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {icon ? <span className="text-brand-500">{icon}</span> : null}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-3xl font-semibold text-gray-900 dark:text-white/90">
          {value}
        </span>
        {trend ? (
          <span className="text-sm font-medium text-emerald-500 dark:text-emerald-400">
            {trend}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default StatCard;
