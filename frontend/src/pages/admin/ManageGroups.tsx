import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";

const ManageGroups: React.FC = () => {
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
        setError(err instanceof Error ? err.message : "Failed to load groups");
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  return (
    <>
      <PageMeta title="Admin | Manage Groups" />
      <PageHeader
        title="Manage Co-ownership Groups"
        description="Review onboarding requests, ownership ratios, and compliance states for every EV sharing group."
        actions={<Button size="sm">Create New Group</Button>}
      />
      
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading groups...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">No groups found.</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      {group.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {group.description || "No description"}
                    </p>
                    <div className="mt-2 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Vehicle: {group.vehicleName}</span>
                      {group.licensePlate && <span>Plate: {group.licensePlate}</span>}
                      <span>Status: {group.status === 1 ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
};

export default ManageGroups;
