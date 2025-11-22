import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";
import Select from "../../components/form/Select";

const VEHICLE_STATUSES = [
  { id: 0, label: "Available", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" },
  { id: 1, label: "In Use", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300" },
  { id: 2, label: "Maintenance", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" },
  { id: 3, label: "Technical Issue", color: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300" },
];

const ManageVehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Store frontend status for each vehicle to preserve user selection
  const [vehicleStatusMap, setVehicleStatusMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ownershipService.getGroups();
      setVehicles(data);
      // Initialize status map from backend data, but preserve existing selections
      setVehicleStatusMap(prev => {
        const newMap = new Map(prev);
        data.forEach(v => {
          if (!newMap.has(v.id)) {
            const statusNumber = mapBackendStatusToFrontend(v.status);
            newMap.set(v.id, statusNumber);
          }
        });
        return newMap;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (vehicleId: string, newStatus: number) => {
    try {
      setError(null);
      // Map frontend status (0-3) to backend GroupStatus
      const backendStatus = mapFrontendStatusToBackend(newStatus);
      
      // Update local status map immediately for better UX
      setVehicleStatusMap(prev => {
        const newMap = new Map(prev);
        newMap.set(vehicleId, newStatus);
        return newMap;
      });
      
      // Call API to update status in database
      await ownershipService.updateGroupStatus(vehicleId, backendStatus);
      
      // Don't reload immediately - keep the selected status visible
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update vehicle status");
      // Revert status on error
      setVehicleStatusMap(prev => {
        const newMap = new Map(prev);
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (vehicle) {
          newMap.set(vehicleId, mapBackendStatusToFrontend(vehicle.status));
        }
        return newMap;
      });
    }
  };

  // Map backend status string to frontend status number
  const mapBackendStatusToFrontend = (backendStatus: string | number, currentFrontendStatus?: number): number => {
    // If we have a current frontend status (from local state), prefer it
    if (currentFrontendStatus !== undefined) {
      return currentFrontendStatus;
    }
    
    if (typeof backendStatus === 'number') {
      return backendStatus;
    }
    // Backend returns: "Active", "Inactive", "Dissolved"
    // Frontend needs: 0=Available, 1=In Use, 2=Maintenance, 3=Technical Issue
    // We'll map: Active -> 0 (Available), Inactive -> 2 (Maintenance)
    const statusMap: Record<string, number> = {
      'Active': 0,      // Available
      'Inactive': 2,    // Maintenance
      'Dissolved': 3,   // Technical Issue
    };
    return statusMap[backendStatus] ?? 0;
  };

  // Map frontend status number to backend status string
  const mapFrontendStatusToBackend = (frontendStatus: number): string => {
    const statusMap: Record<number, string> = {
      0: "Active",   // Available -> Active
      1: "Active",   // In Use -> Active
      2: "Inactive", // Maintenance -> Inactive
      3: "Inactive", // Technical Issue -> Inactive
    };
    return statusMap[frontendStatus] || "Active";
  };

  const getStatus = (status: number) => {
    return VEHICLE_STATUSES.find((s) => s.id === status) || VEHICLE_STATUSES[0];
  };

  return (
    <>
      <PageMeta title="Staff | Manage Vehicles" />
      <PageHeader
        title="Vehicle Management"
        description="View vehicle list and update vehicle status for your assigned groups."
        actions={<Button size="sm" onClick={loadVehicles} disabled={loading}>Refresh</Button>}
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading vehicles...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {vehicles.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">No vehicles found.</p>
            </div>
          ) : (
            vehicles.map((vehicle) => {
              // Get status from map (preserves user selection) or map from backend
              const statusNumber = vehicleStatusMap.get(vehicle.id) ?? mapBackendStatusToFrontend(vehicle.status);
              const status = getStatus(statusNumber);
              return (
                <div
                  key={vehicle.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                            {vehicle.vehicleName}
                          </h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {vehicle.name} • {vehicle.licensePlate || "No license plate"}
                        </p>
                        {vehicle.vehicleModel && vehicle.vehicleYear && (
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {vehicle.vehicleModel} • {vehicle.vehicleYear}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Update Status
                        </p>
                        <Select
                          value={statusNumber.toString()}
                          onChange={(value) => handleStatusChange(vehicle.id, parseInt(value))}
                        >
                          {VEHICLE_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
};

export default ManageVehicles;

