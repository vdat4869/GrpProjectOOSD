import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup, EContract } from "../../services/ownershipService";

const ManageContracts: React.FC = () => {
  const [contracts, setContracts] = useState<EContract[]>([]);
  const [vehicles, setVehicles] = useState<VehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadContracts(selectedGroupId);
    }
  }, [selectedGroupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ownershipService.getGroups();
      setVehicles(data);
      if (data.length > 0) {
        setSelectedGroupId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async (groupId: string) => {
    try {
      const data = await ownershipService.getContracts(groupId);
      setContracts(data);
    } catch (err) {
      console.error("Failed to load contracts:", err);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "signed" || s === "completed")
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300";
    if (s === "pending")
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
    if (s === "cancelled")
      return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
    return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      <PageMeta title="Staff | Manage Contracts" />
      <PageHeader
        title="Contract Management"
        description="View contracts, assist co-owners with signing, and track contract status."
        actions={<Button size="sm" onClick={loadData} disabled={loading}>Refresh</Button>}
      />

      {/* Group Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Vehicle Group
        </label>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.name} - {vehicle.vehicleName}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading contracts...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {contracts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">No contracts found for this group.</p>
            </div>
          ) : (
            contracts.map((contract) => (
              <div
                key={contract.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                          {contract.contractTitle}
                        </h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(contract.contractStatus)}`}>
                          {contract.contractStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Created: {formatDate(contract.createdAt)}
                      </p>
                      {contract.signedAt && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Signed: {formatDate(contract.signedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {contract.coOwnerName && (
                  <div className="p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Co-Owner: {contract.coOwnerName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ownership: {contract.ownershipPercentage}%
                    </p>
                    {contract.notes && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Notes: {contract.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
};

export default ManageContracts;

