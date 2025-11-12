import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const ManageGroups: React.FC = () => {
  return (
    <>
      <PageMeta title="Admin | Manage Groups" />
      <PageHeader
        title="Manage Co-ownership Groups"
        description="Review onboarding requests, ownership ratios, and compliance states for every EV sharing group."
        actions={<Button size="sm">Create New Group</Button>}
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
          Group Oversight Checklist
        </h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>Validate ownership ratios and financial commitments before approval.</li>
          <li>Review outstanding maintenance, booking disputes, or compliance flags.</li>
          <li>Coordinate with staff to ensure onboarding tasks are completed.</li>
          <li>Export group health summaries for executive reporting.</li>
        </ul>
      </div>
    </>
  );
};

export default ManageGroups;
