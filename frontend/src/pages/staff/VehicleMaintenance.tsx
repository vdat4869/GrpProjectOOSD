import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { reportService, MaintenanceRecord, CreateMaintenanceRecordRequest } from "../../services/reportService";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";
import { Modal } from "../../components/ui/modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

const VehicleMaintenance: React.FC = () => {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicleGroups, setVehicleGroups] = useState<VehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateMaintenanceRecordRequest>({
    vehicleId: 0,
    maintenanceType: "",
    description: "",
    cost: 0,
    currency: "VND",
    maintenanceDate: new Date().toISOString().split("T")[0],
    nextMaintenanceDate: "",
    serviceProvider: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      loadMaintenanceRecords();
    }
  }, [selectedVehicleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groups] = await Promise.all([
        ownershipService.getGroups(),
      ]);
      setVehicleGroups(groups);
      if (groups.length > 0) {
        // Use group id as vehicle identifier (simplified)
        const firstVehicleId = parseInt(groups[0].id.replace(/-/g, "").substring(0, 8), 16) || 1;
        setSelectedVehicleId(firstVehicleId);
        setFormData((prev) => ({ ...prev, vehicleId: firstVehicleId }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenanceRecords = async () => {
    if (!selectedVehicleId) return;
    try {
      setLoading(true);
      const records = await reportService.getMaintenanceRecordsByVehicle(selectedVehicleId);
      setMaintenanceRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load maintenance records");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await reportService.createMaintenanceRecord(formData);
      await loadMaintenanceRecords();
      setShowCreateModal(false);
      setFormData({
        vehicleId: selectedVehicleId || 0,
        maintenanceType: "",
        description: "",
        cost: 0,
        currency: "VND",
        maintenanceDate: new Date().toISOString().split("T")[0],
        nextMaintenanceDate: "",
        serviceProvider: "",
        notes: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create maintenance record");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const MAINTENANCE_TYPES = [
    { value: "routine", label: "Routine Maintenance" },
    { value: "repair", label: "Repair" },
    { value: "battery_check", label: "Battery Health Check" },
    { value: "tire_rotation", label: "Tire Rotation" },
    { value: "filter_replacement", label: "Filter Replacement" },
    { value: "inspection", label: "Inspection" },
    { value: "other", label: "Other" },
  ];

  return (
    <>
      <PageMeta title="Staff | Vehicle Maintenance" />
      <PageHeader
        title="Vehicle Maintenance"
        description="Plan preventive upkeep, record service notes, and sync completions with the report service."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            Schedule Service
          </Button>
        }
      />

      {/* Vehicle Selection */}
      <div className="mb-6">
        <Label>Select Vehicle Group</Label>
        <Select
          value={selectedVehicleId?.toString() || ""}
          onChange={(value) => {
            const vehicleId = parseInt(value) || 1;
            setSelectedVehicleId(vehicleId);
            setFormData((prev) => ({ ...prev, vehicleId }));
          }}
        >
          <option value="">Select a vehicle group</option>
          {vehicleGroups.map((group) => {
            const vehicleId = parseInt(group.id.replace(/-/g, "").substring(0, 8), 16) || 1;
            return (
              <option key={group.id} value={vehicleId.toString()}>
                {group.name} - {group.vehicleName}
              </option>
            );
          })}
        </Select>
      </div>

      {/* Maintenance Records */}
      {loading && !maintenanceRecords.length ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Loading maintenance records...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-200">{error}</p>
        </div>
      ) : maintenanceRecords.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">No maintenance records found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {maintenanceRecords.map((record) => (
            <div
              key={record.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      {record.maintenanceType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h3>
                    {record.isActive && (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600 dark:bg-green-500/10 dark:text-green-300">
                        Active
                      </span>
                    )}
                  </div>
                  {record.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{record.description}</p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-3">
                    <div>
                      <span className="font-medium">Date:</span> {formatDate(record.maintenanceDate)}
                    </div>
                    {record.nextMaintenanceDate && (
                      <div>
                        <span className="font-medium">Next:</span> {formatDate(record.nextMaintenanceDate)}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Cost:</span> {record.currency} {record.cost.toLocaleString()}
                    </div>
                    {record.serviceProvider && (
                      <div>
                        <span className="font-medium">Provider:</span> {record.serviceProvider}
                      </div>
                    )}
                  </div>
                  {record.notes && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Notes:</span> {record.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError(null);
        }}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Schedule Maintenance
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Create a new maintenance record for the vehicle.
            </p>
          </div>

          <form onSubmit={handleCreate} className="flex flex-col">
            <div className="custom-scrollbar h-[500px] overflow-y-auto px-2 pb-3">
              {error && (
                <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <Label>
                    Maintenance Type <span className="text-error-500">*</span>
                  </Label>
                  <Select
                    value={formData.maintenanceType}
                    onChange={(value) => setFormData({ ...formData, maintenanceType: value })}
                    disabled={loading}
                    required
                  >
                    <option value="">Select maintenance type</option>
                    {MAINTENANCE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Description</Label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={loading}
                    rows={3}
                    placeholder="Enter maintenance description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>
                      Cost <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.cost || ""}
                      onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                      disabled={loading}
                      required
                      placeholder="0"
                      min="0"
                      step={0.01}
                    />
                  </div>

                  <div>
                    <Label>Currency</Label>
                    <Select
                      value={formData.currency}
                      onChange={(value) => setFormData({ ...formData, currency: value })}
                      disabled={loading}
                    >
                      <option value="VND">VND</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>
                    Maintenance Date <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.maintenanceDate}
                    onChange={(e) => setFormData({ ...formData, maintenanceDate: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <Label>Next Maintenance Date</Label>
                  <Input
                    type="date"
                    value={formData.nextMaintenanceDate}
                    onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label>Service Provider</Label>
                  <Input
                    type="text"
                    value={formData.serviceProvider}
                    onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
                    disabled={loading}
                    placeholder="Enter service provider name"
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    disabled={loading}
                    rows={3}
                    placeholder="Enter additional notes"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                }}
                disabled={loading}
                type="button"
              >
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Maintenance Record"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};

export default VehicleMaintenance;
