/**
 * Trang quản lý nhóm đồng sở hữu xe
 * Cho phép admin tạo, chỉnh sửa, xóa nhóm xe và quản lý thành viên
 */
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup, Ownership, CoOwner, GroupMember } from "../../services/ownershipService";
import { authService, UserSummary } from "../../services/authService";
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
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
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
    imageUrl: "",
    status: 1,
  });
  const [memberFormData, setMemberFormData] = useState({
    coOwnerId: "",
    ownershipPercentage: 0,
  });

  // Load dữ liệu khi component mount
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Tải danh sách nhóm và co-owners từ API
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupsData, coOwnersData] = await Promise.all([
        ownershipService.getGroups(),
        ownershipService.getCoOwners().catch((err) => {
          console.error("Failed to load co-owners in loadData:", err);
          return []; // Return empty array if fails, don't block groups loading
        }),
      ]);
      setGroups(groupsData);
      setCoOwners(coOwnersData);
      console.log("Loaded co-owners in loadData:", coOwnersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách nhóm");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tải danh sách quyền sở hữu và thành viên của một nhóm
   * @param groupId - ID của nhóm cần tải
   */
  const loadGroupOwnerships = async (groupId: string) => {
    try {
      const ownerships = await ownershipService.getOwnerships(groupId);
      setGroupOwnerships(ownerships);
      // Also load group members for role management
      const members = await ownershipService.getGroupMembers(groupId);
      setGroupMembers(members);
    } catch (err) {
      console.error("Không thể tải quyền sở hữu:", err);
    }
  };

  /**
   * Mở modal tạo nhóm mới và reset form
   */
  const handleCreate = () => {
    setFormData({
      name: "",
      description: "",
      vehicleName: "",
      licensePlate: "",
      vehicleModel: "",
      vehicleYear: "",
      imageUrl: "",
      status: 1,
    });
    setIsCreateModalOpen(true);
  };

  /**
   * Mở modal chỉnh sửa nhóm và điền dữ liệu hiện tại vào form
   * @param group - Nhóm cần chỉnh sửa
   */
  const handleEdit = (group: VehicleGroup) => {
    setSelectedGroup(group);
    // Map status: Backend returns "Active" (1), "Inactive" (2), "Dissolved" (3)
    // Frontend uses: 0 = Inactive, 1 = Active
    // If status is string, convert to number; if number, use directly
    let statusValue = 1; // Default to Active
    if (typeof group.status === "string") {
      statusValue = group.status === "Active" ? 1 : 0;
    } else {
      // Backend enum: Active=1, Inactive=2, Dissolved=3
      // Frontend: Active=1, Inactive=0
      statusValue = group.status === 1 ? 1 : 0;
    }
    
    setFormData({
      name: group.name,
      description: group.description || "",
      vehicleName: group.vehicleName,
      licensePlate: group.licensePlate || "",
      vehicleModel: group.vehicleModel || "",
      vehicleYear: group.vehicleYear || "",
      imageUrl: group.imageUrl || "",
      status: statusValue,
    });
    setIsEditModalOpen(true);
  };

  /**
   * Mở modal quản lý thành viên của nhóm
   * @param group - Nhóm cần xem thành viên
   */
  const handleViewMembers = async (group: VehicleGroup) => {
    setSelectedGroup(group);
    await loadGroupOwnerships(group.id);
    setIsMembersModalOpen(true);
  };

  /**
   * Mở modal thêm thành viên mới vào nhóm
   * Lọc danh sách co-owners để chỉ hiển thị những người:
   * - Đã verified
   * - Có role CoOwner (không phải Staff)
   * - Có tài khoản active
   * - Chưa có trong nhóm
   * @param group - Nhóm cần thêm thành viên
   */
  const handleAddMember = async (group: VehicleGroup) => {
    setSelectedGroup(group);
    setMemberFormData({
      coOwnerId: "",
      ownershipPercentage: 0,
    });
    
    // Load group ownerships to get existing members - reload fresh data to ensure we have latest state
    await loadGroupOwnerships(group.id);
    
    // Also load all group members (including Removed) to check for previously removed members
    let allGroupMembers: GroupMember[] = [];
    try {
      allGroupMembers = await ownershipService.getGroupMembers(group.id, true); // includeRemoved = true
    } catch (err) {
      console.warn("Failed to load all group members:", err);
    }
    
    // Reload coOwners to ensure we have the latest list
    try {
      setError(null);
      const coOwnersData = await ownershipService.getCoOwners();
      console.log("Loaded co-owners in handleAddMember:", coOwnersData);
      
      // Get fresh ownerships directly from API to ensure we have the latest data
      // This is important because state might not be updated yet after removing a member
      // Only get active ownerships to exclude removed/inactive ones
      const freshOwnerships = await ownershipService.getOwnerships(group.id, undefined, true);
      console.log("Fresh ownerships loaded (active only):", freshOwnerships);
      
      // Get all users from auth service to check roles and active status
      let allUsers: UserSummary[] = [];
      try {
        const usersResponse = await authService.getUsers("", 1, 1000); // Get all users
        allUsers = usersResponse.users || [];
      } catch (err) {
        console.warn("Failed to load users from auth service:", err);
      }
      
      // Create a map of userId -> user info for quick lookup
      const userMap = new Map<number, UserSummary>();
      allUsers.forEach(user => {
        userMap.set(user.id, user);
      });
      
      // Filter: only verified co-owners who:
      // 1. Are not already active members of this group (check both ownerships and active group members)
      // 2. Have CoOwner role (not Staff)
      // 3. Have active user account (IsActive = true)
      // Note: We allow previously removed members to be re-added (backend will reactivate them)
      // Use freshOwnerships instead of state to ensure we have the latest data
      const existingActiveCoOwnerIds = new Set(freshOwnerships.map(o => o.coOwnerId));
      // Also check active group members
      const activeMemberCoOwnerIds = new Set(
        allGroupMembers
          .filter(m => m.status.toLowerCase() === 'active')
          .map(m => m.coOwnerId)
      );
      // Get all co-owners who have ever been members (including removed) - these can be re-added without verified check
      const previousMemberCoOwnerIds = new Set(
        allGroupMembers.map(m => m.coOwnerId)
      );
      // Combine both sets for active members check
      const allExistingActiveCoOwnerIds = new Set([
        ...Array.from(existingActiveCoOwnerIds),
        ...Array.from(activeMemberCoOwnerIds)
      ]);
      
      console.log("Debug filter co-owners:", {
        totalCoOwners: coOwnersData.length,
        freshOwnerships: freshOwnerships.length,
        existingActiveCoOwnerIds: Array.from(existingActiveCoOwnerIds),
        activeGroupMembers: allGroupMembers.filter(m => m.status.toLowerCase() === 'active').length,
        activeMemberCoOwnerIds: Array.from(activeMemberCoOwnerIds),
        allExistingActiveCoOwnerIds: Array.from(allExistingActiveCoOwnerIds),
        previousMemberCoOwnerIds: Array.from(previousMemberCoOwnerIds),
        totalUsers: allUsers.length
      });
      
      // Track filter reasons for debugging
      const filterStats = {
        total: coOwnersData.length,
        notVerified: 0,
        alreadyInGroup: 0,
        userIdInvalid: 0,
        userNotFound: 0,
        userInactive: 0,
        hasStaffRole: 0,
        noCoOwnerRole: 0,
        passed: 0
      };
      
      const filteredCoOwners = coOwnersData.filter(coOwner => {
        // Check if already active in group (don't filter out removed members - backend will reactivate them)
        if (allExistingActiveCoOwnerIds.has(coOwner.id)) {
          filterStats.alreadyInGroup++;
          return false;
        }
        
        // If co-owner was previously a member (including removed), allow re-adding without verified check
        // This is because they were already verified when first added
        const wasPreviousMember = previousMemberCoOwnerIds.has(coOwner.id);
        
        // Check if verified (skip this check for previous members)
        if (!wasPreviousMember && !coOwner.isVerified) {
          filterStats.notVerified++;
          return false;
        }
        
        // Check user account status and role
        // Convert userId from string to number for lookup
        const userIdNumber = parseInt(coOwner.userId, 10);
        if (isNaN(userIdNumber)) {
          filterStats.userIdInvalid++;
          return false;
        }
        const user = userMap.get(userIdNumber);
        if (!user) {
          // If user not found in auth service, skip (might be deleted)
          filterStats.userNotFound++;
          return false;
        }
        
        // Check if user is active
        if (!user.isActive) {
          filterStats.userInactive++;
          return false;
        }
        
        // Check if user has Staff role (exclude them)
        if (user.roles && user.roles.some(role => role.toLowerCase() === "staff")) {
          filterStats.hasStaffRole++;
          return false;
        }
        
        // Must have CoOwner role
        if (!user.roles || !user.roles.some(role => role.toLowerCase() === "coowner")) {
          filterStats.noCoOwnerRole++;
          return false;
        }
        
        filterStats.passed++;
        return true;
      });
      
      console.log("Filter statistics:", filterStats);
      console.log("Filtered co-owners:", filteredCoOwners.map(c => ({ id: c.id, name: c.fullName, email: c.email })));
      
      setCoOwners(filteredCoOwners);
      
      if (filteredCoOwners.length === 0) {
        console.warn("No available co-owners to add", filterStats);
        const reasons = [];
        if (filterStats.notVerified > 0) reasons.push(`${filterStats.notVerified} chưa verified`);
        if (filterStats.alreadyInGroup > 0) reasons.push(`${filterStats.alreadyInGroup} đã là thành viên`);
        if (filterStats.userNotFound > 0) reasons.push(`${filterStats.userNotFound} không tìm thấy user`);
        if (filterStats.userInactive > 0) reasons.push(`${filterStats.userInactive} tài khoản không hoạt động`);
        if (filterStats.hasStaffRole > 0) reasons.push(`${filterStats.hasStaffRole} có role Staff`);
        if (filterStats.noCoOwnerRole > 0) reasons.push(`${filterStats.noCoOwnerRole} không có role CoOwner`);
        
        setError(`Không tìm thấy co-owner nào khả dụng. ${reasons.length > 0 ? `Lý do: ${reasons.join(', ')}.` : ''} Tất cả co-owners đã verified có thể đã là thành viên của nhóm này, hoặc họ có role Staff hoặc tài khoản không hoạt động.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load co-owners";
      console.error("Failed to load co-owners:", err);
      setError(`Không thể tải danh sách co-owners: ${errorMessage}. Vui lòng kiểm tra quyền truy cập của bạn (yêu cầu role Admin/Staff).`);
    }
    
    setIsAddMemberModalOpen(true);
  };

  /**
   * Lưu nhóm mới hoặc cập nhật nhóm hiện có
   */
  const handleSave = async () => {
    try {
      if (isCreateModalOpen) {
        // Create new group
        await ownershipService.createGroup({
          name: formData.name,
          description: formData.description,
          vehicleName: formData.vehicleName,
          licensePlate: formData.licensePlate,
          vehicleModel: formData.vehicleModel,
          vehicleYear: formData.vehicleYear,
          imageUrl: formData.imageUrl || undefined,
        });
      } else if (isEditModalOpen && selectedGroup) {
        // Update existing group
        // Map status: 0 -> "Inactive" (2), 1 -> "Active" (1)
        const statusMap: Record<number, string> = {
          0: "Inactive",  // Maps to GroupStatus.Inactive (2)
          1: "Active",    // Maps to GroupStatus.Active (1)
        };
        await ownershipService.updateGroup(selectedGroup.id, {
          name: formData.name,
          description: formData.description,
          vehicleName: formData.vehicleName,
          licensePlate: formData.licensePlate,
          vehicleModel: formData.vehicleModel,
          vehicleYear: formData.vehicleYear,
          imageUrl: formData.imageUrl || undefined,
          status: statusMap[formData.status] || "Active",
        });
      }
      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedGroup(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu nhóm");
    }
  };

  /**
   * Xóa nhóm khỏi hệ thống
   * @param groupId - ID của nhóm cần xóa
   */
  const handleDelete = async (groupId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhóm này không?")) return;
    try {
      setError(null);
      // Call API to delete group from database
      await ownershipService.deleteGroup(groupId);
      // Reload groups from database
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa nhóm");
    }
  };

  /**
   * Lưu thành viên mới vào nhóm
   * Tạo ownership record và thêm vào group members
   */
  const handleSaveMember = async () => {
    if (!selectedGroup) return;
    
    // Validate form data
    if (!memberFormData.coOwnerId) {
      setError("Vui lòng chọn một co-owner");
      return;
    }
    
    if (memberFormData.ownershipPercentage <= 0 || memberFormData.ownershipPercentage > 100) {
      setError("Tỷ lệ sở hữu phải nằm trong khoảng từ 0.01 đến 100");
      return;
    }

    try {
      setError(null);
      
      // Create ownership record
      await ownershipService.createOwnership({
        vehicleGroupId: selectedGroup.id,
        coOwnerId: memberFormData.coOwnerId,
        ownershipPercentage: memberFormData.ownershipPercentage,
        startDate: new Date().toISOString(),
      });

      // Also add as group member if not already a member
      try {
        await ownershipService.addCoOwnerToGroup(selectedGroup.id, {
          coOwnerId: memberFormData.coOwnerId,
          role: "Member",
        });
      } catch (memberErr) {
        // Member might already exist, ignore error
        console.log("Group member might already exist:", memberErr);
      }

      // Reset form
      setMemberFormData({
        coOwnerId: "",
        ownershipPercentage: 0,
      });
      setIsAddMemberModalOpen(false);
      
      // Reload ownerships and members to show new member
      await loadGroupOwnerships(selectedGroup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thêm thành viên");
    }
  };

  /**
   * Xóa thành viên khỏi nhóm
   * Xóa ownership record và group member record
   * @param ownershipId - ID của ownership record cần xóa
   */
  const handleRemoveMember = async (ownershipId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa thành viên này không?")) return;
    if (!selectedGroup) return;
    
    try {
      setError(null);
      // Find ownership to get coOwnerId
      const ownership = groupOwnerships.find(o => o.id === ownershipId);
      if (!ownership) {
        setError("Ownership not found");
        return;
      }
      
      // Delete ownership
      await ownershipService.deleteOwnership(ownershipId);
      
      // Also remove from group members if exists
      const member = groupMembers.find(m => m.coOwnerId === ownership.coOwnerId);
      if (member) {
        try {
          await ownershipService.removeCoOwnerFromGroup(selectedGroup.id, member.id);
        } catch (memberErr) {
          // Ignore error if member doesn't exist
          console.log("Group member might not exist:", memberErr);
        }
      }
      
      // Reload immediately
      await loadGroupOwnerships(selectedGroup.id);
      
      // Also reload group members separately to ensure UI updates
      try {
        const members = await ownershipService.getGroupMembers(selectedGroup.id);
        setGroupMembers(members);
      } catch (err) {
        console.error("Failed to reload group members:", err);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa thành viên");
    }
  };

  /**
   * Đặt một thành viên làm admin của nhóm
   * @param ownershipId - ID của ownership record
   */
  const handleSetGroupAdmin = async (ownershipId: string) => {
    if (!confirm("Đặt thành viên này làm admin của nhóm?")) return;
    if (!selectedGroup) return;
    
    try {
      setError(null);
      // Find the ownership to get coOwnerId
      const ownership = groupOwnerships.find(o => o.id === ownershipId);
      if (!ownership) {
        setError("Không tìm thấy quyền sở hữu");
        return;
      }
      
      // Find the corresponding group member
      const member = groupMembers.find(m => m.coOwnerId === ownership.coOwnerId);
      if (!member) {
        setError("Không tìm thấy thành viên nhóm. Vui lòng thêm thành viên vào nhóm trước.");
        return;
      }
      
      // Update member role to Admin
      await ownershipService.updateGroupMemberRole(selectedGroup.id, member.id, "Admin");
      
      // Reload data
      await loadGroupOwnerships(selectedGroup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đặt admin nhóm");
    }
  };

  /**
   * Định dạng ngày tháng theo định dạng Việt Nam
   * @param dateString - Chuỗi ngày tháng cần định dạng
   * @returns Chuỗi ngày tháng đã định dạng
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const totalOwnership = groupOwnerships.reduce((sum, o) => sum + o.ownershipPercentage, 0);

  /**
   * Đồng bộ danh sách co-owners từ Auth Service
   */
  const handleSyncCoOwners = async () => {
    try {
      setError(null);
      const result = await ownershipService.syncCoOwnersFromAuth();
      alert(`Sync completed!\nCreated: ${result.created}\nSkipped: ${result.skipped}${result.errors && result.errors.length > 0 ? `\nErrors: ${result.errors.length}` : ""}`);
      // Reload co-owners after sync
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đồng bộ co-owners");
    }
  };

  return (
    <>
      <PageMeta title="Admin | Quản Lý Nhóm" />
      <PageHeader
        title="Quản Lý Nhóm Đồng Sở Hữu"
        description="Xem xét yêu cầu tham gia, tỷ lệ sở hữu và trạng thái tuân thủ cho mỗi nhóm chia sẻ xe điện."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSyncCoOwners}>
              Đồng Bộ Co-owners
            </Button>
            <Button size="sm" onClick={handleCreate}>Tạo Nhóm Mới</Button>
          </div>
        }
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải danh sách nhóm...</p>
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
              <p className="text-gray-600 dark:text-gray-400">Không tìm thấy nhóm nào.</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <div className="flex items-start gap-4">
                    {group.imageUrl && (
                      <div className="flex-shrink-0">
                        <img 
                          src={group.imageUrl} 
                          alt={group.vehicleName}
                          className="h-24 w-24 rounded-lg object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                            {group.name}
                          </h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            (typeof group.status === "string" ? group.status === "Active" : group.status === 1)
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300"
                          }`}>
                            {typeof group.status === "string" ? group.status : (group.status === 1 ? "Active" : "Inactive")}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {group.description || "Không có mô tả"}
                        </p>
                        <div className="mt-2 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Xe: {group.vehicleName}</span>
                          {group.licensePlate && <span>Biển số: {group.licensePlate}</span>}
                          {group.vehicleModel && group.vehicleYear && (
                            <span>{group.vehicleModel} • {group.vehicleYear}</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Tạo lúc: {formatDate(group.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewMembers(group)}>
                          Quản Lý Thành Viên
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(group)}>
                          Chỉnh Sửa
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(group.id)}>
                          Xóa
                        </Button>
                      </div>
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
              Tạo Nhóm Mới
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Tạo một nhóm đồng sở hữu mới.
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Tên Nhóm <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên nhóm"
              />
            </div>

            <div>
              <Label>Tên Xe <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                value={formData.vehicleName}
                onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                placeholder="Nhập tên xe"
              />
            </div>

            <div>
              <Label>URL Hình Ảnh Xe</Label>
              <Input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
              {formData.imageUrl && (
                <div className="mt-2">
                  <img 
                    src={formData.imageUrl} 
                    alt="Preview"
                    className="h-32 w-full rounded-lg object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Biển Số Xe</Label>
                <Input
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  placeholder="Nhập biển số xe"
                />
              </div>

              <div>
                <Label>Trạng Thái</Label>
                <Select
                  value={formData.status.toString()}
                  onChange={(value) => setFormData({ ...formData, status: parseInt(value) })}
                >
                  <option value="1">Hoạt Động</option>
                  <option value="0">Không Hoạt Động</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Mẫu Xe</Label>
                <Select
                  value={formData.vehicleModel}
                  onChange={(value) => setFormData({ ...formData, vehicleModel: value })}
                >
                  <option value="">Chọn mẫu xe</option>
                  {VEHICLE_MODELS.map((model) => (
                    <option key={model.id} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Năm Sản Xuất</Label>
                <Input
                  type="text"
                  value={formData.vehicleYear}
                  onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                  placeholder="Nhập năm sản xuất"
                />
              </div>
            </div>

            <div>
              <Label>Mô Tả</Label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Nhập mô tả"
              />
            </div>

            <div className="flex items-center gap-3 lg:justify-end mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Hủy
              </Button>
              <Button size="sm" onClick={handleSave}>
                Tạo Nhóm
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
              Chỉnh Sửa Nhóm
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Cập nhật thông tin nhóm.
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Tên Nhóm <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên nhóm"
              />
            </div>

            <div>
              <Label>Tên Xe <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                value={formData.vehicleName}
                onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                placeholder="Nhập tên xe"
              />
            </div>

            <div>
              <Label>URL Hình Ảnh Xe</Label>
              <Input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
              {formData.imageUrl && (
                <div className="mt-2">
                  <img 
                    src={formData.imageUrl} 
                    alt="Preview"
                    className="h-32 w-full rounded-lg object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Biển Số Xe</Label>
                <Input
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  placeholder="Nhập biển số xe"
                />
              </div>

              <div>
                <Label>Trạng Thái</Label>
                <Select
                  value={formData.status.toString()}
                  onChange={(value) => setFormData({ ...formData, status: parseInt(value) })}
                >
                  <option value="1">Hoạt Động</option>
                  <option value="0">Không Hoạt Động</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Mẫu Xe</Label>
                <Select
                  value={formData.vehicleModel}
                  onChange={(value) => setFormData({ ...formData, vehicleModel: value })}
                >
                  <option value="">Chọn mẫu xe</option>
                  {VEHICLE_MODELS.map((model) => (
                    <option key={model.id} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Năm Sản Xuất</Label>
                <Input
                  type="text"
                  value={formData.vehicleYear}
                  onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                  placeholder="Nhập năm sản xuất"
                />
              </div>
            </div>

            <div>
              <Label>Mô Tả</Label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Nhập mô tả"
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
                Hủy
              </Button>
              <Button size="sm" onClick={handleSave}>
                Lưu Thay Đổi
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
                  Quản Lý Thành Viên
                </h4>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                  {selectedGroup?.name}
                </p>
              </div>
              <Button size="sm" onClick={() => selectedGroup && handleAddMember(selectedGroup)}>
                Thêm Thành Viên
              </Button>
            </div>
          </div>

          <div className="px-2">
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/40 dark:bg-blue-500/10">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Tổng Quyền Sở Hữu: <span className="font-semibold">{totalOwnership.toFixed(2)}%</span>
                {totalOwnership !== 100 && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    (Nên là 100%)
                  </span>
                )}
              </p>
            </div>

            {groupOwnerships.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                Không tìm thấy thành viên nào.
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
                          {coOwner?.email || "Không có email"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Bắt đầu: {formatDate(ownership.startDate)}
                          {ownership.endDate && ` • Kết thúc: ${formatDate(ownership.endDate)}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetGroupAdmin(ownership.id)}
                        >
                          Đặt Admin
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMember(ownership.id)}
                        >
                          Xóa
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
              Thêm Thành Viên
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Thêm một co-owner mới vào nhóm.
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Co-owner <span className="text-error-500">*</span></Label>
              <Select
                value={memberFormData.coOwnerId}
                onChange={(value) => setMemberFormData({ ...memberFormData, coOwnerId: value })}
              >
                <option value="">Chọn co-owner</option>
                {coOwners.map((coOwner) => (
                  <option key={coOwner.id} value={coOwner.id}>
                    {coOwner.fullName} ({coOwner.email})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Tỷ Lệ Sở Hữu <span className="text-error-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={memberFormData.ownershipPercentage === 0 ? "" : String(memberFormData.ownershipPercentage)}
                onChange={(e) => setMemberFormData({ ...memberFormData, ownershipPercentage: parseFloat(e.target.value) || 0 })}
                placeholder="Nhập tỷ lệ sở hữu"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Tổng hiện tại: {totalOwnership.toFixed(2)}% • Còn lại: {(100 - totalOwnership).toFixed(2)}%
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
                Hủy
              </Button>
              <Button size="sm" onClick={handleSaveMember}>
                Thêm Thành Viên
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ManageGroups;
