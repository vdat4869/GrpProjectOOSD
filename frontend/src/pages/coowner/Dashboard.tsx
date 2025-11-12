import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import LineChartOne from "../../components/charts/line/LineChartOne";

const CoownerDashboard: React.FC = () => {
  const firstName =
    typeof window !== "undefined" ? localStorage.getItem("firstName") : null;

  return (
    <>
      <PageMeta title="Co-owner | Dashboard" />
      <PageHeader
        title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
        description="Track your bookings, payments, and usage trends across every shared EV you co-own."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Upcoming Trips" value={3} trend="Next 7 days" />
        <StatCard label="Shared Vehicles" value={2} trend="Stable" />
        <StatCard label="Balance Due" value="₫0" trend="Paid in full" />
        <StatCard label="Voting Items" value={1} trend="New" />
      </div>
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            Personal Usage Trend
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review how often you have booked compared to the group average over the past 12 months.
          </p>
        </div>
        <LineChartOne />
      </div>
    </>
  );
};

export default CoownerDashboard;
