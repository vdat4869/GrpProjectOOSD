import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import BarChartOne from "../../components/charts/bar/BarChartOne";

const StaffDashboard: React.FC = () => {
  return (
    <>
      <PageMeta title="Staff | Dashboard" />
      <PageHeader
        title="Operations Control Center"
        description="Track daily assignments, booking throughput, and maintenance backlog for the EV fleet."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Scheduled Check-ins" value={18} trend="▲ 2" />
        <StatCard label="Vehicles in Service" value={42} trend="▲ 4" />
        <StatCard label="Open Maintenance" value={5} trend="▼ 3" />
        <StatCard label="Pending Disputes" value={2} trend="Stable" />
      </div>
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            Daily Task Allocation
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Visualize staff workload distribution for proactive shift planning.
          </p>
        </div>
        <BarChartOne />
      </div>
    </>
  );
};

export default StaffDashboard;
