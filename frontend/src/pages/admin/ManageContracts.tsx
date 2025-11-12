import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const ManageContracts: React.FC = () => {
  return (
    <>
      <PageMeta title="Admin | Manage Contracts" />
      <PageHeader
        title="Contract Lifecycle Management"
        description="Oversee digital agreements, renewal schedules, and compliance checkpoints for every co-ownership contract."
        actions={<Button size="sm">Upload Amendment</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
            Key Workflows
          </h3>
          <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>Track signature completion status for all stakeholders.</li>
            <li>Monitor renewal deadlines and automatic escalation rules.</li>
            <li>Synchronize approved contracts with payment and booking services.</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-200">
            Coming soon: contract diff viewer
          </p>
          <p className="mt-2">
            Integrate with the report service to surface legal change logs, and attach supporting documents from NiFi workflows.
          </p>
        </div>
      </div>
    </>
  );
};

export default ManageContracts;
