import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup, EContract } from "../../services/ownershipService";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

const CONTRACT_TYPES = ["Co-ownership Agreement", "Amendment", "Termination", "Other"];
const CONTRACT_STATUSES = ["Draft", "Pending", "Signed", "Cancelled", "Expired"];

const ManageContracts: React.FC = () => {
  const [contracts, setContracts] = useState<EContract[]>([]);
  const [vehicles, setVehicles] = useState<VehicleGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [_selectedContract, setSelectedContract] = useState<EContract | null>(null);
  const [formData, setFormData] = useState({
    vehicleGroupId: "",
    contractType: "",
    status: "Draft",
  });

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

  const handleCreate = () => {
    setFormData({
      vehicleGroupId: selectedGroupId || "",
      contractType: "",
      status: "Draft",
    });
    setIsCreateModalOpen(true);
  };

  const handleEdit = (contract: EContract) => {
    setSelectedContract(contract);
    setFormData({
      vehicleGroupId: contract.vehicleGroupId,
      contractType: contract.contractType,
      status: contract.status,
    });
    setIsEditModalOpen(true);
  };

  const handleApprove = async (_contractId: string) => {
    if (!confirm("Approve this contract?")) return;
    try {
      // TODO: Implement approve contract API call
      if (selectedGroupId) {
        await loadContracts(selectedGroupId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve contract");
    }
  };

  const handleCancel = async (_contractId: string) => {
    if (!confirm("Cancel this contract?")) return;
    try {
      // TODO: Implement cancel contract API call
      if (selectedGroupId) {
        await loadContracts(selectedGroupId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel contract");
    }
  };

  const handleSave = async () => {
    try {
      // TODO: Implement create/update contract API call
      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedContract(null);
      if (selectedGroupId) {
        await loadContracts(selectedGroupId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contract");
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "signed" || s === "completed")
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300";
    if (s === "pending")
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
    if (s === "cancelled" || s === "expired")
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
      <PageMeta title="Admin | Manage Contracts" />
      <PageHeader
        title="Contract Lifecycle Management"
        description="Oversee digital agreements, renewal schedules, and compliance checkpoints for every co-ownership contract."
        actions={<Button size="sm" onClick={handleCreate}>Create Contract</Button>}
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
                          {contract.contractType}
                        </h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(contract.status)}`}>
                          {contract.status}
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
                    <div className="flex gap-2">
                      {contract.status.toLowerCase() === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => handleApprove(contract.id)}>
                          Approve
                        </Button>
                      )}
                      {contract.status.toLowerCase() !== "cancelled" && contract.status.toLowerCase() !== "signed" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(contract)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleCancel(contract.id)}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {contract.signedBy && contract.signedBy.length > 0 && (
                  <div className="p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Signed By:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {contract.signedBy.map((signer, index) => (
                        <span
                          key={index}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                          {signer}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Contract Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Create Contract
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Create a new e-contract for the selected vehicle group.
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Vehicle Group <span className="text-error-500">*</span></Label>
              <Select
                value={formData.vehicleGroupId}
                onChange={(value) => setFormData({ ...formData, vehicleGroupId: value })}
              >
                <option value="">Select vehicle group</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - {vehicle.vehicleName}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Contract Type <span className="text-error-500">*</span></Label>
              <Select
                value={formData.contractType}
                onChange={(value) => setFormData({ ...formData, contractType: value })}
              >
                <option value="">Select contract type</option>
                {CONTRACT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value })}
              >
                {CONTRACT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-3 lg:justify-end mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Create Contract
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Contract Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedContract(null);
        }}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Contract
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update contract information.
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Contract Type <span className="text-error-500">*</span></Label>
              <Select
                value={formData.contractType}
                onChange={(value) => setFormData({ ...formData, contractType: value })}
              >
                {CONTRACT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value })}
              >
                {CONTRACT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-3 lg:justify-end mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedContract(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ManageContracts;
