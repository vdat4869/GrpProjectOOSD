import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const DisputeManagement: React.FC = () => {
  return (
    <>
      <PageMeta title="Admin | Dispute Management" />
      <PageHeader
        title="Dispute Management"
        description="Oversee escalations between co-owners, ensure SLAs are met, and document outcomes across services."
        actions={<Button size="sm">Export Timeline</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
            Active Escalations
          </h3>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Pull live status data from the Report and Payment services to understand how disputes impact settlements and cost sharing.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <li>• Booking conflicts awaiting AI fairness recommendation.</li>
            <li>• Maintenance backlog requiring staff acknowledgement.</li>
            <li>• Payment discrepancies under review with finance.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-200">
            Workflow integration hint
          </p>
          <p className="mt-2">
            Use RabbitMQ events to notify staff dashboards in real-time, and archive decisions in the analytics pipeline for governance audits.
          </p>
        </div>
      </div>
    </>
  );
};

export default DisputeManagement;
