import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import LineChartOne from "../../components/charts/line/LineChartOne";

const AdminDashboard: React.FC = () => {
  return (
    <>
      <PageMeta title="Admin | Dashboard" />
      <PageHeader
        title="Administrator Overview"
        description="Monitor group performance, system health, and governance signals across the EV co-ownership network."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Groups" value="24" trend="▲ 6.8%" />
        <StatCard label="Pending Contracts" value="12" trend="▼ 1.1%" />
        <StatCard label="Open Disputes" value="3" trend="Stable" />
        <StatCard label="Monthly Revenue" value="₫128M" trend="▲ 12.4%" />
      </div>
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            Platform Growth
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Combined bookings and revenue trends across all co-ownership groups.
          </p>
        </div>
        <LineChartOne />
      </div>
    </>
  );
};

export default AdminDashboard;
