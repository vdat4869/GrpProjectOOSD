/**
 * Trang quản lý hợp đồng điện tử
 * Cho phép admin tạo, chỉnh sửa, phê duyệt và hủy hợp đồng cho các nhóm đồng sở hữu
 */
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup, EContract, Ownership } from "../../services/ownershipService";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Input from "../../components/form/input/InputField";

const ManageContracts: React.FC = () => {
  const [contracts, setContracts] = useState<EContract[]>([]);
  const [vehicles, setVehicles] = useState<VehicleGroup[]>([]);
  const [ownerships, setOwnerships] = useState<Ownership[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [_selectedContract, setSelectedContract] = useState<EContract | null>(null);
  const [formData, setFormData] = useState({
    vehicleGroupId: "",
    coOwnerId: "",
    contractTitle: "",
    contractContent: "",
    ownershipPercentage: 0,
    notes: "",
  });

  // Load dữ liệu khi component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load hợp đồng và quyền sở hữu khi chọn nhóm xe
  useEffect(() => {
    if (selectedGroupId) {
      loadContracts(selectedGroupId);
      loadOwnerships(selectedGroupId);
    }
  }, [selectedGroupId]);

  /**
   * Tải danh sách quyền sở hữu của một nhóm xe
   * @param groupId - ID của nhóm xe
   */
  const loadOwnerships = async (groupId: string) => {
    try {
      const data = await ownershipService.getOwnerships(groupId);
      setOwnerships(data.filter(o => o.isActive));
    } catch (err) {
      console.error("Không thể tải quyền sở hữu:", err);
    }
  };

  /**
   * Tải danh sách nhóm xe từ API
   */
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
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tải danh sách hợp đồng của một nhóm xe
   * @param groupId - ID của nhóm xe
   */
  const loadContracts = async (groupId: string) => {
    try {
      const data = await ownershipService.getContracts(groupId);
      setContracts(data);
    } catch (err) {
      console.error("Không thể tải hợp đồng:", err);
    }
  };

  /**
   * Mở modal tạo hợp đồng mới và reset form
   */
  const handleCreate = () => {
    setFormData({
      vehicleGroupId: selectedGroupId || "",
      coOwnerId: ownerships.length > 0 ? ownerships[0].coOwnerId : "",
      contractTitle: "",
      contractContent: "",
      ownershipPercentage: 0,
      notes: "",
    });
    setIsCreateModalOpen(true);
  };

  /**
   * Mở modal chỉnh sửa hợp đồng và điền dữ liệu hiện tại vào form
   * @param contract - Hợp đồng cần chỉnh sửa
   */
  const handleEdit = (contract: EContract) => {
    setSelectedContract(contract);
    setFormData({
      vehicleGroupId: contract.vehicleGroupId,
      coOwnerId: contract.coOwnerId,
      contractTitle: contract.contractTitle,
      contractContent: contract.contractContent,
      ownershipPercentage: contract.ownershipPercentage,
      notes: contract.notes || "",
    });
    setIsEditModalOpen(true);
  };

  /**
   * Phê duyệt hợp đồng
   * @param contractId - ID của hợp đồng cần phê duyệt
   */
  const handleApprove = async (contractId: string) => {
    if (!confirm("Phê duyệt hợp đồng này?")) return;
    try {
      setError(null);
      await ownershipService.approveContract(contractId);
      if (selectedGroupId) {
        await loadContracts(selectedGroupId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể phê duyệt hợp đồng");
    }
  };

  /**
   * Hủy hợp đồng (xóa vĩnh viễn)
   * @param contractId - ID của hợp đồng cần hủy
   */
  const handleCancel = async (contractId: string) => {
    if (!confirm("Hủy hợp đồng này? Hành động này sẽ xóa hợp đồng vĩnh viễn.")) return;
    try {
      setError(null);
      await ownershipService.deleteContract(contractId);
      if (selectedGroupId) {
        await loadContracts(selectedGroupId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hủy hợp đồng");
    }
  };

  /**
   * Lưu hợp đồng mới hoặc cập nhật hợp đồng hiện có
   * Khi tạo mới, tự động tạo hợp đồng cho tất cả thành viên active trong nhóm
   */
  const handleSave = async () => {
    try {
      if (!formData.vehicleGroupId || !formData.contractTitle || !formData.contractContent) {
        setError("Vui lòng điền đầy đủ các trường bắt buộc");
        return;
      }

      if (isCreateModalOpen) {
        // Tự động tạo hợp đồng cho tất cả thành viên trong nhóm
        const activeOwnerships = ownerships.filter(o => o.isActive);
        if (activeOwnerships.length === 0) {
          setError("Không tìm thấy thành viên active trong nhóm này. Vui lòng thêm thành viên trước.");
          return;
        }

        // Tạo hợp đồng cho từng thành viên
        const contractPromises = activeOwnerships.map(ownership =>
          ownershipService.createContract({
            vehicleGroupId: formData.vehicleGroupId,
            coOwnerId: ownership.coOwnerId,
            contractTitle: formData.contractTitle,
            contractContent: formData.contractContent,
            ownershipPercentage: ownership.ownershipPercentage,
            notes: formData.notes || undefined,
          })
        );

        await Promise.all(contractPromises);
      } else if (_selectedContract) {
        await ownershipService.updateContract(_selectedContract.id, {
          contractTitle: formData.contractTitle,
          contractContent: formData.contractContent,
          ownershipPercentage: formData.ownershipPercentage,
          notes: formData.notes || undefined,
        });
      }

      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedContract(null);
      setError(null);
      if (selectedGroupId) {
        await loadContracts(selectedGroupId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu hợp đồng");
    }
  };

  /**
   * Lấy màu hiển thị cho trạng thái hợp đồng
   * @param status - Trạng thái hợp đồng
   * @returns Class CSS cho màu
   */
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

  return (
    <>
      <PageMeta title="Admin | Quản Lý Hợp Đồng" />
      <PageHeader
        title="Quản Lý Vòng Đời Hợp Đồng"
        description="Giám sát các thỏa thuận kỹ thuật số, lịch gia hạn và các điểm kiểm tra tuân thủ cho mỗi hợp đồng đồng sở hữu."
        actions={<Button size="sm" onClick={handleCreate}>Tạo Hợp Đồng</Button>}
      />

      {/* Bộ chọn nhóm xe */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chọn Nhóm Xe
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
          <p className="text-gray-600 dark:text-gray-400">Đang tải hợp đồng...</p>
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
              <p className="text-gray-600 dark:text-gray-400">Không tìm thấy hợp đồng nào cho nhóm này.</p>
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
                        Tạo lúc: {formatDate(contract.createdAt)}
                      </p>
                      {contract.signedAt && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Ký lúc: {formatDate(contract.signedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {contract.contractStatus.toLowerCase() === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => handleApprove(contract.id)}>
                          Phê Duyệt
                        </Button>
                      )}
                      {contract.contractStatus.toLowerCase() !== "cancelled" && contract.contractStatus.toLowerCase() !== "signed" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(contract)}>
                            Chỉnh Sửa
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleCancel(contract.id)}>
                            Hủy
                          </Button>
                        </>
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
                      Quyền sở hữu: {contract.ownershipPercentage}%
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Tạo Hợp Đồng */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Tạo Hợp Đồng
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Tạo hợp đồng điện tử mới cho nhóm xe đã chọn.
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Nhóm Xe <span className="text-error-500">*</span></Label>
              <Select
                value={formData.vehicleGroupId}
                onChange={(value) => {
                  setFormData({ ...formData, vehicleGroupId: value });
                  loadOwnerships(value);
                }}
              >
                <option value="">Chọn nhóm xe</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - {vehicle.vehicleName}
                  </option>
                ))}
              </Select>
            </div>

            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
              <p className="font-medium">Lưu ý:</p>
              <p>Hợp đồng này sẽ được tự động tạo cho tất cả thành viên active trong nhóm xe đã chọn.</p>
              <p className="mt-1">Thành viên active: {ownerships.length}</p>
            </div>

            <div>
              <Label>Tiêu Đề Hợp Đồng <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                value={formData.contractTitle}
                onChange={(e) => setFormData({ ...formData, contractTitle: e.target.value })}
                placeholder="Nhập tiêu đề hợp đồng"
              />
            </div>

            <div>
              <Label>Nội Dung Hợp Đồng <span className="text-error-500">*</span></Label>
              <textarea
                value={formData.contractContent}
                onChange={(e) => setFormData({ ...formData, contractContent: e.target.value })}
                placeholder="Nhập nội dung hợp đồng"
                rows={6}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            <div>
              <Label>Ghi Chú</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ghi chú tùy chọn"
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
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
                Tạo Hợp Đồng
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Chỉnh Sửa Hợp Đồng */}
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
              Chỉnh Sửa Hợp Đồng
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Cập nhật thông tin hợp đồng.
            </p>
          </div>

          <div className="px-2 space-y-4">
            <div>
              <Label>Tiêu Đề Hợp Đồng <span className="text-error-500">*</span></Label>
              <Input
                type="text"
                value={formData.contractTitle}
                onChange={(e) => setFormData({ ...formData, contractTitle: e.target.value })}
                placeholder="Nhập tiêu đề hợp đồng"
              />
            </div>

            <div>
              <Label>Nội Dung Hợp Đồng <span className="text-error-500">*</span></Label>
              <textarea
                value={formData.contractContent}
                onChange={(e) => setFormData({ ...formData, contractContent: e.target.value })}
                placeholder="Nhập nội dung hợp đồng"
                rows={6}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            <div>
              <Label>Tỷ Lệ Sở Hữu <span className="text-error-500">*</span></Label>
              <Input
                type="number"
                value={formData.ownershipPercentage || ""}
                onChange={(e) => setFormData({ ...formData, ownershipPercentage: parseFloat(e.target.value) || 0 })}
                placeholder="Nhập tỷ lệ sở hữu (0.01-100)"
                min="0.01"
                max="100"
                step="0.01"
              />
            </div>

            <div>
              <Label>Ghi Chú</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ghi chú tùy chọn"
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
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
                Hủy
              </Button>
              <Button size="sm" onClick={handleSave}>
                Lưu Thay Đổi
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ManageContracts;
