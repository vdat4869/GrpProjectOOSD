import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup, Ownership, CoOwner } from "../../services/ownershipService";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";

const OwnershipDetails: React.FC = () => {
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [coOwners, setCoOwners] = useState<CoOwner[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<VehicleGroup | null>(null);
  const [groupOwnerships, setGroupOwnerships] = useState<Ownership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditOwnershipModalOpen, setIsEditOwnershipModalOpen] = useState(false);
  const [selectedOwnership, setSelectedOwnership] = useState<Ownership | null>(null);
  const [memberFormData, setMemberFormData] = useState({
    coOwnerId: "",
    ownershipPercentage: 0,
  });
  const [editFormData, setEditFormData] = useState({
    ownershipPercentage: 0,
  });
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

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
      if (groupsData.length > 0) {
        setSelectedGroup(groupsData[0]);
        await loadGroupOwnerships(groupsData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ownership details");
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

  const handleGroupChange = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setSelectedGroup(group);
      await loadGroupOwnerships(groupId);
    }
  };

  const handleAddMember = (group: VehicleGroup) => {
    setSelectedGroup(group);
    setMemberFormData({
      coOwnerId: "",
      ownershipPercentage: 0,
    });
    setIsAddMemberModalOpen(true);
  };

  const handleEditOwnership = (ownership: Ownership) => {
    setSelectedOwnership(ownership);
    setEditFormData({
      ownershipPercentage: ownership.ownershipPercentage,
    });
    setIsEditOwnershipModalOpen(true);
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

  const handleSaveOwnership = async () => {
    if (!selectedOwnership || !selectedGroup) return;
    try {
      // TODO: Implement update ownership API call
      setIsEditOwnershipModalOpen(false);
      setSelectedOwnership(null);
      await loadGroupOwnerships(selectedGroup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ownership");
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
  const currentUserOwnership = groupOwnerships.find(
    (o) => o.coOwnerId === userId || coOwners.find((c) => c.userId === userId && c.id === o.coOwnerId)
  );

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
        <>
          {/* Group Selector */}
          {groups.length > 1 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Vehicle Group
              </label>
              <select
                value={selectedGroup?.id || ""}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} - {group.vehicleName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedGroup && (
            <>
              {/* Group Info */}
              <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      {selectedGroup.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {selectedGroup.vehicleName} • {selectedGroup.licensePlate || "No license plate"}
                    </p>
                    {currentUserOwnership && (
                      <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Your Ownership: <span className="text-primary-600 dark:text-primary-400">{currentUserOwnership.ownershipPercentage}%</span>
                      </p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => handleAddMember(selectedGroup)}>
                    Add Member
                  </Button>
                </div>
              </div>

              {/* Ownership Summary */}
              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/40 dark:bg-blue-500/10">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Total Ownership: <span className="font-semibold">{totalOwnership.toFixed(2)}%</span>
                  {totalOwnership !== 100 && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      (Should be 100%)
                    </span>
                  )}
                </p>
              </div>

              {/* Members List */}
              <div className="grid gap-4">
                {groupOwnerships.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-gray-600 dark:text-gray-400">No members found.</p>
                  </div>
                ) : (
                  groupOwnerships.map((ownership) => {
                    const coOwner = coOwners.find((c) => c.id === ownership.coOwnerId);
                    const isCurrentUser = coOwner?.userId === userId || ownership.coOwnerId === userId;
                    return (
                      <div
                        key={ownership.id}
                        className={`overflow-hidden rounded-2xl border shadow-theme-xs ${
                          isCurrentUser
                            ? "border-primary-200 bg-primary-50 dark:border-primary-500/40 dark:bg-primary-500/10"
                            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                        }`}
                      >
                        <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                                  {coOwner?.fullName || ownership.coOwnerName || ownership.coOwnerId.substring(0, 8)}
                                </h3>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                                  {ownership.ownershipPercentage}%
                                </span>
                                {isCurrentUser && (
                                  <span className="rounded-full bg-primary-500 px-3 py-1 text-xs font-medium text-white">
                                    You
                                  </span>
                                )}
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
                                onClick={() => handleEditOwnership(ownership)}
                              >
                                Edit
                              </Button>
                              {!isCurrentUser && (
                                <>
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
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </>
      )}

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
                {coOwners
                  .filter((c) => !groupOwnerships.some((o) => o.coOwnerId === c.id && o.isActive))
                  .map((coOwner) => (
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

      {/* Edit Ownership Modal */}
      <Modal
        isOpen={isEditOwnershipModalOpen}
        onClose={() => {
          setIsEditOwnershipModalOpen(false);
          setSelectedOwnership(null);
        }}
        className="max-w-[500px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Ownership
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update ownership percentage.
            </p>
          </div>

          <div className="px-2 space-y-4">
            {selectedOwnership && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Member: {coOwners.find((c) => c.id === selectedOwnership.coOwnerId)?.fullName || selectedOwnership.coOwnerName || selectedOwnership.coOwnerId.substring(0, 8)}
                </p>
              </div>
            )}

            <div>
              <Label>Ownership Percentage <span className="text-error-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={editFormData.ownershipPercentage === 0 ? "" : String(editFormData.ownershipPercentage)}
                onChange={(e) => setEditFormData({ ...editFormData, ownershipPercentage: parseFloat(e.target.value) || 0 })}
                placeholder="Enter ownership percentage"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Current total: {totalOwnership.toFixed(2)}% • Remaining: {(100 - totalOwnership + (selectedOwnership?.ownershipPercentage || 0)).toFixed(2)}%
              </p>
            </div>

            <div className="flex items-center gap-3 lg:justify-end mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditOwnershipModalOpen(false);
                  setSelectedOwnership(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveOwnership}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default OwnershipDetails;
