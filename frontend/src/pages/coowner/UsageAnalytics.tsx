import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import LineChartOne from "../../components/charts/line/LineChartOne";
import Button from "../../components/ui/button/Button";

const UsageAnalytics: React.FC = () => {
  return (
    <>
      <PageMeta title="Co-owner | Usage Analytics" />
      <PageHeader
        title="Usage Analytics"
        description="Compare your driving habits with group averages and surface cost-saving opportunities."
        actions={<Button size="sm">Download CSV</Button>}
      />
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
            Booking vs. Ownership Ratio
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Track whether your bookings align with agreed ownership percentages. The AI service can recommend fair scheduling adjustments.
          </p>
          <div className="mt-6">
            <LineChartOne />
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-200">
            Coming soon
          </p>
          <p className="mt-2">
            Real-time notifications when your usage deviates significantly from group averages, helping maintain transparency and fairness.
          </p>
        </div>
      </div>
    </>
  );
};

export default UsageAnalytics;
