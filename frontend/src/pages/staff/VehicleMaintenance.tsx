import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { reportService, MaintenanceRecord, CreateMaintenanceRecordRequest, UpdateMaintenanceRecordRequest } from "../../services/reportService";
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateMaintenanceRecordRequest & { mileageAtService?: number }>({});
  const [formData, setFormData] = useState<CreateMaintenanceRecordRequest & { mileageAtService?: number }>({
    vehicleId: 0,
    maintenanceType: "",
    description: "",
    cost: 0,
    currency: "VND",
    maintenanceDate: new Date().toISOString().split("T")[0],
    nextMaintenanceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Default to 90 days later
    serviceProvider: "",
    notes: "",
    mileageAtService: 0,
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
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tải danh sách bản ghi bảo dưỡng theo vehicleId
   */
  const loadMaintenanceRecords = async () => {
    if (!selectedVehicleId) return;
    try {
      setLoading(true);
      setError(null);
      const records = await reportService.getMaintenanceRecordsByVehicle(selectedVehicleId);
      setMaintenanceRecords(records);
      if (records.length === 0) {
        console.log(`Không tìm thấy bản ghi bảo dưỡng cho vehicleId: ${selectedVehicleId}`);
      } else {
        console.log(`Đã tải ${records.length} bản ghi bảo dưỡng cho vehicleId: ${selectedVehicleId}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Không thể tải bản ghi bảo dưỡng";
      setError(errorMessage);
      console.error("Lỗi khi tải bản ghi bảo dưỡng:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tạo bản ghi bảo dưỡng mới
   * @param e - Form submit event
   */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      console.log("Đang tạo bản ghi bảo dưỡng với dữ liệu:", formData);
      const created = await reportService.createMaintenanceRecord(formData);
      if (!created) {
        throw new Error("Không thể tạo bản ghi bảo dưỡng - không có dữ liệu trả về");
      }
      console.log("Đã tạo bản ghi bảo dưỡng thành công:", created);
      // Đợi một chút để database được cập nhật
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadMaintenanceRecords();
      setShowCreateModal(false);
      setFormData({
        vehicleId: selectedVehicleId || 0,
        maintenanceType: "",
        description: "",
        cost: 0,
        currency: "VND",
        maintenanceDate: new Date().toISOString().split("T")[0],
        nextMaintenanceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        serviceProvider: "",
        notes: "",
        mileageAtService: 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Không thể tạo bản ghi bảo dưỡng";
      setError(errorMessage);
      console.error("Lỗi khi tạo bản ghi bảo dưỡng:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mở modal chỉnh sửa bản ghi bảo dưỡng
   * @param record - Bản ghi bảo dưỡng cần chỉnh sửa
   */
  const handleEdit = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setEditFormData({
      maintenanceType: record.maintenanceType,
      description: record.description,
      cost: record.cost,
      maintenanceDate: record.maintenanceDate,
      nextMaintenanceDate: record.nextMaintenanceDate,
      serviceProvider: record.serviceProvider,
      notes: record.notes,
      mileageAtService: record.mileageAtService || 0,
    });
    setShowEditModal(true);
  };

  /**
   * Cập nhật bản ghi bảo dưỡng
   * @param e - Form submit event
   */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      setLoading(true);
      setError(null);
      const updated = await reportService.updateMaintenanceRecord(selectedRecord.id, editFormData);
      if (updated) {
        await loadMaintenanceRecords();
        setShowEditModal(false);
        setSelectedRecord(null);
        setEditFormData({});
      } else {
        throw new Error("Không thể cập nhật bản ghi bảo dưỡng");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Không thể cập nhật bản ghi bảo dưỡng";
      setError(errorMessage);
      console.error("Lỗi khi cập nhật bản ghi bảo dưỡng:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xóa bản ghi bảo dưỡng
   * @param id - ID bản ghi bảo dưỡng
   */
  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi bảo dưỡng này?")) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const success = await reportService.deleteMaintenanceRecord(id);
      if (success) {
        await loadMaintenanceRecords();
      } else {
        throw new Error("Không thể xóa bản ghi bảo dưỡng");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Không thể xóa bản ghi bảo dưỡng";
      setError(errorMessage);
      console.error("Lỗi khi xóa bản ghi bảo dưỡng:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Đánh dấu bảo dưỡng hoàn thành và tạo cost share
   * @param id - ID bản ghi bảo dưỡng
   */
  const handleMarkAsCompleted = async (id: number) => {
    if (!confirm("Đánh dấu bảo dưỡng này là hoàn thành? Hành động này sẽ tạo cost share để thanh toán.")) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const updated = await reportService.markMaintenanceAsCompleted(id);
      if (updated) {
        await loadMaintenanceRecords();
      } else {
        throw new Error("Không thể đánh dấu bảo dưỡng hoàn thành");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Không thể đánh dấu bảo dưỡng hoàn thành";
      setError(errorMessage);
      console.error("Lỗi khi đánh dấu bảo dưỡng hoàn thành:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Lấy nhãn trạng thái bảo dưỡng
   * @param record - Bản ghi bảo dưỡng
   * @returns Nhãn trạng thái (tiếng Việt)
   */
  const getStatusLabel = (record: MaintenanceRecord) => {
    // Kiểm tra status field trước (có thể là "2", "Completed", hoặc number 2)
    const status = record.status;
    const statusStr = status?.toString().toLowerCase();
    const statusNum = status ? Number(status) : undefined;
    
    if (statusStr === "2" || statusNum === 2 || statusStr === "completed") {
      return "Hoàn thành";
    }
    if (statusStr === "1" || statusNum === 1 || statusStr === "inprogress") {
      return "Đang thực hiện";
    }
    if (statusStr === "0" || statusNum === 0 || statusStr === "scheduled") {
      return "Đã lên lịch";
    }
    if (statusStr === "3" || statusNum === 3 || statusStr === "overdue") {
      return "Quá hạn";
    }
    // Fallback: kiểm tra isActive
    if (!record.isActive) {
      return "Hoàn thành";
    }
    return "Đang hoạt động";
  };

  /**
   * Lấy màu hiển thị cho trạng thái
   * @param record - Bản ghi bảo dưỡng
   * @returns CSS classes cho màu
   */
  const getStatusColor = (record: MaintenanceRecord) => {
    const completed = isCompleted(record);
    if (completed) {
      return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
    }
    return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300";
  };

  /**
   * Kiểm tra xem bảo dưỡng đã hoàn thành chưa
   * @param record - Bản ghi bảo dưỡng
   * @returns true nếu đã hoàn thành
   */
  const isCompleted = (record: MaintenanceRecord) => {
    const status = record.status;
    const statusStr = status?.toString().toLowerCase();
    const statusNum = status ? Number(status) : undefined;
    // Kiểm tra cả number và string (backend có thể serialize enum thành number hoặc string)
    return (
      statusStr === "2" || 
      statusNum === 2 || 
      statusStr === "completed" || 
      !record.isActive
    );
  };

  /**
   * Định dạng ngày tháng theo định dạng Việt Nam
   * @param dateString - Chuỗi ngày tháng
   * @returns Ngày tháng đã định dạng (dd/mm/yyyy)
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  /**
   * Danh sách các loại bảo dưỡng
   */
  const MAINTENANCE_TYPES = [
    { value: "routine", label: "Bảo dưỡng định kỳ" },
    { value: "repair", label: "Sửa chữa" },
    { value: "battery_check", label: "Kiểm tra pin" },
    { value: "tire_rotation", label: "Đảo lốp" },
    { value: "filter_replacement", label: "Thay lọc" },
    { value: "inspection", label: "Kiểm tra" },
    { value: "other", label: "Khác" },
  ];

  return (
    <>
      <PageMeta title="Nhân viên | Bảo dưỡng xe" />
      <PageHeader
        title="Bảo dưỡng xe"
        description="Lên lịch bảo dưỡng định kỳ, ghi chú dịch vụ, và đồng bộ hoàn thành với dịch vụ báo cáo."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            Lên lịch bảo dưỡng
          </Button>
        }
      />

      {/* Chọn nhóm xe */}
      <div className="mb-6">
        <Label>Chọn nhóm xe</Label>
        <Select
          value={selectedVehicleId?.toString() || ""}
          onChange={(value) => {
            const vehicleId = parseInt(value) || 1;
            setSelectedVehicleId(vehicleId);
            setFormData((prev) => ({ ...prev, vehicleId }));
          }}
        >
          <option value="">Chọn nhóm xe</option>
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

      {/* Danh sách bảo dưỡng */}
      {loading && !maintenanceRecords.length ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Đang tải bản ghi bảo dưỡng...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-200">{error}</p>
        </div>
      ) : maintenanceRecords.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Không tìm thấy bản ghi bảo dưỡng</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {maintenanceRecords.map((record) => (
            <div
              key={record.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      {record.maintenanceType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(record)}`}>
                      {getStatusLabel(record)}
                    </span>
                  </div>
                  {record.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{record.description}</p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-3">
                    <div>
                      <span className="font-medium">Ngày:</span> {formatDate(record.maintenanceDate)}
                    </div>
                    {record.nextMaintenanceDate && (
                      <div>
                        <span className="font-medium">Lần sau:</span> {formatDate(record.nextMaintenanceDate)}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Chi phí:</span> {record.currency} {record.cost.toLocaleString()}
                    </div>
                    {record.serviceProvider && (
                      <div>
                        <span className="font-medium">Nhà cung cấp:</span> {record.serviceProvider}
                      </div>
                    )}
                  </div>
                  {record.notes && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Ghi chú:</span> {record.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-[120px]">
                  {!isCompleted(record) && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleMarkAsCompleted(record.id)}
                      disabled={loading}
                    >
                      Đánh dấu hoàn thành
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleEdit(record)}
                    disabled={loading}
                  >
                    Sửa
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleDelete(record.id)}
                    disabled={loading}
                  >
                    Xóa
                  </Button>
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
              Lên lịch bảo dưỡng
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Tạo bản ghi bảo dưỡng mới cho xe.
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
                    Loại bảo dưỡng <span className="text-error-500">*</span>
                  </Label>
                  <Select
                    value={formData.maintenanceType}
                    onChange={(value) => setFormData({ ...formData, maintenanceType: value })}
                    disabled={loading}
                    required
                  >
                    <option value="">Chọn loại bảo dưỡng</option>
                    {MAINTENANCE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Mô tả</Label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={loading}
                    rows={3}
                    placeholder="Nhập mô tả bảo dưỡng"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>
                      Chi Phí <span className="text-error-500">*</span>
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
                    <Label>Loại tiền tệ</Label>
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
                  <Label>Số km tại thời điểm bảo dưỡng (km)</Label>
                  <Input
                    type="number"
                    value={formData.mileageAtService || ""}
                    onChange={(e) => setFormData({ ...formData, mileageAtService: parseFloat(e.target.value) || 0 })}
                    disabled={loading}
                    placeholder="0"
                    min="0"
                    step={0.01}
                  />
                </div>

                <div>
                  <Label>
                    Ngày Bảo Dưỡng <span className="text-error-500">*</span>
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
                  <Label>Ngày Bảo Dưỡng Tiếp Theo</Label>
                  <Input
                    type="date"
                    value={formData.nextMaintenanceDate}
                    onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label>Nhà cung cấp dịch vụ</Label>
                  <Input
                    type="text"
                    value={formData.serviceProvider}
                    onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
                    disabled={loading}
                    placeholder="Nhập tên nhà cung cấp dịch vụ"
                  />
                </div>

                <div>
                  <Label>Ghi chú</Label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    disabled={loading}
                    rows={3}
                    placeholder="Nhập ghi chú bổ sung"
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
                Hủy
              </Button>
              <Button size="sm" type="submit" disabled={loading}>
                {loading ? "Đang tạo..." : "Tạo bản ghi bảo dưỡng"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedRecord(null);
          setEditFormData({});
          setError(null);
        }}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Sửa bản ghi bảo dưỡng
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Cập nhật thông tin bản ghi bảo dưỡng.
            </p>
          </div>

          <form onSubmit={handleUpdate} className="flex flex-col">
            <div className="custom-scrollbar h-[500px] overflow-y-auto px-2 pb-3">
              {error && (
                <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <Label>
                    Loại Bảo Dưỡng <span className="text-error-500">*</span>
                  </Label>
                  <Select
                    value={editFormData.maintenanceType || ""}
                    onChange={(value) => setEditFormData({ ...editFormData, maintenanceType: value })}
                    disabled={loading}
                    required
                  >
                    <option value="">Chọn loại bảo dưỡng</option>
                    {MAINTENANCE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Mô tả</Label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    value={editFormData.description || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    disabled={loading}
                    rows={3}
                    placeholder="Nhập mô tả bảo dưỡng"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>
                      Chi phí <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={editFormData.cost || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, cost: parseFloat(e.target.value) || 0 })}
                      disabled={loading}
                      required
                      placeholder="0"
                      min="0"
                      step={0.01}
                    />
                  </div>

                  <div>
                    <Label>Số km tại thời điểm bảo dưỡng (km)</Label>
                    <Input
                      type="number"
                      value={editFormData.mileageAtService || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, mileageAtService: parseFloat(e.target.value) || 0 })}
                      disabled={loading}
                      placeholder="0"
                      min="0"
                      step={0.01}
                    />
                  </div>
                </div>

                <div>
                  <Label>
                    Ngày bảo dưỡng <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={editFormData.maintenanceDate || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, maintenanceDate: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <Label>Ngày bảo dưỡng tiếp theo</Label>
                  <Input
                    type="date"
                    value={editFormData.nextMaintenanceDate || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, nextMaintenanceDate: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label>Nhà cung cấp dịch vụ</Label>
                  <Input
                    type="text"
                    value={editFormData.serviceProvider || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, serviceProvider: e.target.value })}
                    disabled={loading}
                    placeholder="Nhập tên nhà cung cấp dịch vụ"
                  />
                </div>

                <div>
                  <Label>Ghi chú</Label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                    value={editFormData.notes || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    disabled={loading}
                    rows={3}
                    placeholder="Nhập ghi chú bổ sung"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRecord(null);
                  setEditFormData({});
                  setError(null);
                }}
                disabled={loading}
                type="button"
              >
                Hủy
              </Button>
              <Button size="sm" type="submit" disabled={loading}>
                {loading ? "Đang cập nhật..." : "Cập nhật bản ghi bảo dưỡng"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};

export default VehicleMaintenance;
