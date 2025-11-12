import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const ManageStaff: React.FC = () => {
  return (
    <>
      <PageMeta title="Admin | Manage Staff" />
      <PageHeader
        title="Staff Administration"
        description="Provision and audit internal staff accounts who coordinate bookings, maintenance, and dispute resolution."
        actions={<Button size="sm">Invite Staff Member</Button>}
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
          Staff Responsibilities
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Operations",
              details:
                "Manage on-site check-ins, coordinate charging schedules, and keep vehicles in optimal condition.",
            },
            {
              title: "Member Support",
              details:
                "Resolve booking issues, triage disputes, and ensure co-owners remain compliant with group policies.",
            },
            {
              title: "Data Quality",
              details:
                "Verify ownership records, update maintenance logs, and sync reports with the analytics service.",
            },
            {
              title: "Security",
              details:
                "Monitor login activity, enforce MFA policies, and collaborate with admins on escalations.",
            },
          ].map(({ title, details }) => (
            <div key={title} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {title}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{details}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ManageStaff;
