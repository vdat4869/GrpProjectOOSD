import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";

const OwnershipDetails: React.FC = () => {
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        const data = await ownershipService.getGroups();
        setGroups(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ownership details");
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  return (
    <>
      <PageMeta title="Co-owner | Ownership Details" />
      <PageHeader
        title="Ownership Details"
        description="Understand your equity split, privileges, and shared responsibilities across each EV."
      />
      
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading ownership details...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">No ownership groups found.</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                  {group.name}
                </h3>
                <dl className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between">
                    <dt>Vehicle</dt>
                    <dd className="font-medium text-gray-900 dark:text-white/90">
                      {group.vehicleName}
                    </dd>
                  </div>
                  {group.licensePlate && (
                    <div className="flex justify-between">
                      <dt>License Plate</dt>
                      <dd className="font-medium text-gray-900 dark:text-white/90">
                        {group.licensePlate}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt>Status</dt>
                    <dd className="font-medium text-gray-900 dark:text-white/90">
                      {group.status === 1 ? "Active" : "Inactive"}
                    </dd>
                  </div>
                  {group.description && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {group.description}
                      </p>
                    </div>
                  )}
                </dl>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
};

export default OwnershipDetails;
