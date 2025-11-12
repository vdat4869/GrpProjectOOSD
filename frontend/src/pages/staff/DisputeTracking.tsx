import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const DisputeTracking: React.FC = () => {
  return (
    <>
      <PageMeta title="Staff | Dispute Tracking" />
      <PageHeader
        title="Dispute Tracking"
        description="Assist administrators by triaging escalations, logging updates, and keeping co-owners informed."
        actions={<Button size="sm">Open Escalation Console</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
            Triage Checklist
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>• Review evidence from booking and payment services.</li>
            <li>• Collect statements from involved co-owners.</li>
            <li>• Coordinate with admins for final arbitration decisions.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-200">
            Tip
          </p>
          <p className="mt-2">
            Use report-service analytics to spot recurring patterns, then surface proactive training opportunities for groups with repeated disputes.
          </p>
        </div>
      </div>
    </>
  );
};

export default DisputeTracking;
