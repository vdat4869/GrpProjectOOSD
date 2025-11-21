import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup, Ownership, CoOwner } from "../../services/ownershipService";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { VEHICLE_MODELS } from "../../config/vehicleModels";

const ManageGroups: React.FC = () => {
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [coOwners, setCoOwners] = useState<CoOwner[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<VehicleGroup | null>(null);
  const [groupOwnerships, setGroupOwnerships] = useState<Ownership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    vehicleName: "",
    licensePlate: "",
    vehicleModel: "",
    vehicleYear: "",
    status: 1,
  });
  const [memberFormData, setMemberFormData] = useState({
    coOwnerId: "",
    ownershipPercentage: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupsData, coOwnersData] = await Promise.all([
        ownershipService.getGroups(),
        ownershipService.getCoOwners(),
      ]);
      setGroups(groupsData);
      setCoOwners(coOwnersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const loadGroupOwnerships = async (groupId: string) => {
    try {
      const ownerships = await ownershipService.getOwnerships(groupId);
      setGroupOwnerships(ownerships);
    } catch (err) {
      console.error("Failed to load ownerships:", err);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: "",
      description: "",
      vehicleName: "",
      licensePlate: "",
      vehicleModel: "",
      vehicleYear: "",
      status: 1,
    });
    setIsCreateModalOpen(true);
  };

  const handleEdit = (group: VehicleGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      vehicleName: group.vehicleName,
      licensePlate: group.licensePlate || "",
      vehicleModel: group.vehicleModel || "",
      vehicleYear: group.vehicleYear || "",
      status: group.status,
    });
    setIsEditModalOpen(true);
  };

  const handleViewMembers = async (group: VehicleGroup) => {
    setSelectedGroup(group);
    await loadGroupOwnerships(group.id);
    setIsMembersModalOpen(true);
  };

  const handleAddMember = (group: VehicleGroup) => {
    setSelectedGroup(group);
    setMemberFormData({
      coOwnerId: "",
      ownershipPercentage: 0,
    });
    setIsAddMemberModalOpen(true);
  };

  const handleSave = async () => {
    try {
      // TODO: Implement create/update group API call
      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedGroup(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save group");
    }
  };

  const handleDelete = async (_groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      // TODO: Implement delete group API call
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    }
  };

  const handleSaveMember = async () => {
    if (!selectedGroup) return;
    try {
      // TODO: Implement add member API call
      setIsAddMemberModalOpen(false);
      await loadGroupOwnerships(selectedGroup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  };

  const handleRemoveMember = async (_ownershipId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      // TODO: Implement remove member API call
      if (selectedGroup) {
        await loadGroupOwnerships(selectedGroup.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleSetGroupAdmin = async (_ownershipId: string) => {
    if (!confirm("Set this member as group admin?")) return;
    try {
      // TODO: Implement set group admin API call
      if (selectedGroup) {
        await loadGroupOwnerships(selectedGroup.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set group admin");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const totalOwnership = groupOwnerships.reduce((sum, o) => sum + o.ownershipPercentage, 0);

  return (
    <>
      <PageMeta title="Admin | Manage Groups" />
      <PageHeader
        title="Manage Co-ownership Groups"
        description="Review onboarding requests, ownership ratios, and compliance states for every EV sharing group."
        actions={<Button size="sm" onClick={handleCreate}>Create New Group</Button>}
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
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">No groups found.</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                          {group.name}
                        </h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          group.status === 1
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300"
                        }`}>
                          {group.status === 1 ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {group.description || "No description"}
                      </p>
                      <div className="mt-2 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Vehicle: {group.vehicleName}</span>
                        {group.licensePlate && <span>Plate: {group.licensePlate}</span>}
                        {group.vehicleModel && group.vehicleYear && (
                          <span>{group.vehicleModel} • {group.vehicleYear}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Created: {formatDate(group.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewMembers(group)}>
                        Manage Members
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(group)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(group.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Create New Group
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Create a new co-ownership group.
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Group Name <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter group name"
              />
            </div>

            <div>
              <Label>Vehicle Name <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                value={formData.vehicleName}
                onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                placeholder="Enter vehicle name"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>License Plate</Label>
                <Input
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  placeholder="Enter license plate"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status.toString()}
                  onChange={(value) => setFormData({ ...formData, status: parseInt(value) })}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Model</Label>
                <Select
                  value={formData.vehicleModel}
                  onChange={(value) => setFormData({ ...formData, vehicleModel: value })}
                >
                  <option value="">Select vehicle model</option>
                  {VEHICLE_MODELS.map((model) => (
                    <option key={model.id} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Year</Label>
                <Input
                  type="text"
                  value={formData.vehicleYear}
                  onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                  placeholder="Enter vehicle year"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Enter description"
              />
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
                Create Group
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedGroup(null);
        }}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Group
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update group information.
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Group Name <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter group name"
              />
            </div>

            <div>
              <Label>Vehicle Name <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                value={formData.vehicleName}
                onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                placeholder="Enter vehicle name"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>License Plate</Label>
                <Input
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  placeholder="Enter license plate"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status.toString()}
                  onChange={(value) => setFormData({ ...formData, status: parseInt(value) })}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Model</Label>
                <Select
                  value={formData.vehicleModel}
                  onChange={(value) => setFormData({ ...formData, vehicleModel: value })}
                >
                  <option value="">Select vehicle model</option>
                  {VEHICLE_MODELS.map((model) => (
                    <option key={model.id} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Year</Label>
                <Input
                  type="text"
                  value={formData.vehicleYear}
                  onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                  placeholder="Enter vehicle year"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Enter description"
              />
            </div>

            <div className="flex items-center gap-3 lg:justify-end mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedGroup(null);
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

      {/* Manage Members Modal */}
      <Modal
        isOpen={isMembersModalOpen}
        onClose={() => {
          setIsMembersModalOpen(false);
          setSelectedGroup(null);
          setGroupOwnerships([]);
        }}
        className="max-w-[800px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[800px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                  Manage Members
                </h4>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                  {selectedGroup?.name}
                </p>
              </div>
              <Button size="sm" onClick={() => selectedGroup && handleAddMember(selectedGroup)}>
                Add Member
              </Button>
            </div>
          </div>

          <div className="px-2">
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/40 dark:bg-blue-500/10">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Total Ownership: <span className="font-semibold">{totalOwnership.toFixed(2)}%</span>
                {totalOwnership !== 100 && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    (Should be 100%)
                  </span>
                )}
              </p>
            </div>

            {groupOwnerships.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No members found.
              </p>
            ) : (
              <div className="space-y-3">
                {groupOwnerships.map((ownership) => {
                  const coOwner = coOwners.find((c) => c.id === ownership.coOwnerId);
                  return (
                    <div
                      key={ownership.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h5 className="font-medium text-gray-900 dark:text-white/90">
                            {coOwner?.fullName || ownership.coOwnerName || ownership.coOwnerId.substring(0, 8)}
                          </h5>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                            {ownership.ownershipPercentage}%
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {coOwner?.email || "No email"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Start: {formatDate(ownership.startDate)}
                          {ownership.endDate && ` • End: ${formatDate(ownership.endDate)}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetGroupAdmin(ownership.id)}
                        >
                          Set Admin
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMember(ownership.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setSelectedGroup(null);
        }}
        className="max-w-[500px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Add Member
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Add a new co-owner to the group.
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Co-owner <span className="text-error-500">*</span></Label>
              <Select
                value={memberFormData.coOwnerId}
                onChange={(value) => setMemberFormData({ ...memberFormData, coOwnerId: value })}
              >
                <option value="">Select co-owner</option>
                {coOwners.map((coOwner) => (
                  <option key={coOwner.id} value={coOwner.id}>
                    {coOwner.fullName} ({coOwner.email})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Ownership Percentage <span className="text-error-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={memberFormData.ownershipPercentage === 0 ? "" : String(memberFormData.ownershipPercentage)}
                onChange={(e) => setMemberFormData({ ...memberFormData, ownershipPercentage: parseFloat(e.target.value) || 0 })}
                placeholder="Enter ownership percentage"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Current total: {totalOwnership.toFixed(2)}% • Remaining: {(100 - totalOwnership).toFixed(2)}%
              </p>
            </div>

            <div className="flex items-center gap-3 lg:justify-end mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddMemberModalOpen(false);
                  setSelectedGroup(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveMember}>
                Add Member
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ManageGroups;
