import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";

const groups = [
  {
    name: "Group Aurora",
    vehicle: "Tesla Model 3",
    role: "Primary co-owner",
    ratio: "40%",
  },
  {
    name: "Group Velocity",
    vehicle: "Hyundai Kona",
    role: "Co-owner",
    ratio: "25%",
  },
];

const OwnershipDetails: React.FC = () => {
  return (
    <>
      <PageMeta title="Co-owner | Ownership Details" />
      <PageHeader
        title="Ownership Details"
        description="Understand your equity split, privileges, and shared responsibilities across each EV."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <div
            key={group.name}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
              {group.name}
            </h3>
            <dl className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <dt>Vehicle</dt>
                <dd className="font-medium text-gray-900 dark:text-white/90">
                  {group.vehicle}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Your Role</dt>
                <dd className="font-medium text-gray-900 dark:text-white/90">
                  {group.role}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Ownership Ratio</dt>
                <dd className="font-medium text-gray-900 dark:text-white/90">
                  {group.ratio}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  );
};

export default OwnershipDetails;
