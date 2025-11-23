/**
 * Trang quản lý xe
 * Cho phép admin thêm, chỉnh sửa, xóa xe và theo dõi trạng thái của chúng trên tất cả các nhóm đồng sở hữu
 */
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";
import { bookingService, Booking } from "../../services/bookingService";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { VEHICLE_MODELS } from "../../config/vehicleModels";

/**
 * Interface cho trạng thái xe
 */
interface VehicleStatus {
  id: number;
  label: string;
  color: string;
}

/**
 * Danh sách các trạng thái xe
 */
const VEHICLE_STATUSES: VehicleStatus[] = [
  { id: 0, label: "Có Sẵn", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" },
  { id: 1, label: "Đang Sử Dụng", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300" },
  { id: 2, label: "Bảo Dưỡng", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" },
  { id: 3, label: "Sự Cố Kỹ Thuật", color: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300" },
];

const ManageVehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleGroup[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [_selectedVehicle, setSelectedVehicle] = useState<VehicleGroup | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    vehicleName: "",
    licensePlate: "",
    vehicleModel: "",
    vehicleYear: "",
    imageUrl: "",
    status: 0,
  });

  // Load dữ liệu khi component mount
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Tải danh sách vehicles và bookings từ API
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [vehiclesData, bookingsData] = await Promise.all([
        ownershipService.getGroups(),
        bookingService.getBookings(),
      ]);
      setVehicles(vehiclesData);
      setBookings(bookingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách xe");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Chuyển đổi trạng thái từ backend (string) sang frontend (number)
   * Backend: "Active", "Inactive", "Dissolved"
   * Frontend: 0=Available, 1=In Use, 2=Maintenance, 3=Technical Issue
   * @param backendStatus - Trạng thái từ backend
   * @returns Số trạng thái cho frontend
   */
  const mapBackendStatusToFrontend = (backendStatus: string | number): number => {
    if (typeof backendStatus === 'number') {
      return backendStatus;
    }
    // Backend returns: "Active", "Inactive", "Dissolved"
    // Frontend needs: 0=Available, 1=In Use, 2=Maintenance, 3=Technical Issue
    const statusMap: Record<string, number> = {
      'Active': 0,      // Available
      'Inactive': 2,    // Maintenance
      'Dissolved': 3,   // Technical Issue
    };
    return statusMap[backendStatus] ?? 0;
  };

  /**
   * Chuyển đổi trạng thái từ frontend (number) sang backend (string)
   * @param frontendStatus - Số trạng thái từ frontend
   * @returns Chuỗi trạng thái cho backend
   */
  const mapFrontendStatusToBackend = (frontendStatus: number): string => {
    const statusMap: Record<number, string> = {
      0: "Active",   // Available -> Active
      1: "Active",   // In Use -> Active
      2: "Inactive", // Maintenance -> Inactive
      3: "Inactive", // Technical Issue -> Inactive
    };
    return statusMap[frontendStatus] || "Active";
  };

  /**
   * Lấy thông tin trạng thái xe
   * @param status - Số trạng thái
   * @returns Thông tin trạng thái
   */
  const getVehicleStatus = (status: number) => {
    return VEHICLE_STATUSES.find((s) => s.id === status) || VEHICLE_STATUSES[0];
  };

  /**
   * Lấy danh sách bookings của một xe
   * @param vehicleId - ID của xe
   * @returns Danh sách bookings
   */
  const getVehicleBookings = (vehicleId: string | number) => {
    return bookings.filter((b) => b.vehicleId.toString() === vehicleId.toString());
  };

  /**
   * Lấy danh sách bookings đang active của một xe
   * @param vehicleId - ID của xe
   * @returns Danh sách bookings đang active
   */
  const getActiveBookings = (vehicleId: string) => {
    const vehicleBookings = getVehicleBookings(vehicleId);
    const now = new Date();
    // Backend statuses: "Pending", "Confirmed", "Approved", "Đã đặt", "InProgress", "Completed", "Cancelled", "NoShow"
    // Active statuses: Confirmed, Approved, InProgress, và các booking đang trong khoảng thời gian
    const activeStatuses = ["confirmed", "approved", "inprogress", "in-progress", "đã đặt"];
    return vehicleBookings.filter(
      (b) => {
        const statusLower = b.status.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
        const isActiveStatus = activeStatuses.some(s => statusLower.includes(s));
        const isInTimeRange = new Date(b.startTime) <= now && new Date(b.endTime) >= now;
        return isActiveStatus && isInTimeRange;
      }
    );
  };

  /**
   * Mở modal tạo xe mới và reset form
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
      status: 0,
    });
    setIsCreateModalOpen(true);
  };

  /**
   * Mở modal chỉnh sửa xe và điền dữ liệu hiện tại vào form
   * @param vehicle - Xe cần chỉnh sửa
   */
  const handleEdit = (vehicle: VehicleGroup) => {
    setSelectedVehicle(vehicle);
    // Map backend status string to frontend status number
    const statusNumber = mapBackendStatusToFrontend(vehicle.status);
    setFormData({
      name: vehicle.name,
      description: vehicle.description || "",
      vehicleName: vehicle.vehicleName,
      licensePlate: vehicle.licensePlate || "",
      vehicleModel: vehicle.vehicleModel || "",
      vehicleYear: vehicle.vehicleYear || "",
      imageUrl: vehicle.imageUrl || "",
      status: statusNumber,
    });
    setIsEditModalOpen(true);
  };

  /**
   * Lưu xe mới hoặc cập nhật xe hiện có
   */
  const handleSave = async () => {
    try {
      if (isCreateModalOpen) {
        // Create new vehicle group
        await ownershipService.createGroup({
          name: formData.name,
          description: formData.description,
          vehicleName: formData.vehicleName,
          licensePlate: formData.licensePlate,
          vehicleModel: formData.vehicleModel,
          vehicleYear: formData.vehicleYear,
          imageUrl: formData.imageUrl || undefined,
        });
      } else if (isEditModalOpen && _selectedVehicle) {
        // Update existing vehicle group
        // Map frontend status number to backend status string
        const backendStatus = mapFrontendStatusToBackend(formData.status);
        await ownershipService.updateGroup(_selectedVehicle.id, {
          name: formData.name,
          description: formData.description,
          vehicleName: formData.vehicleName,
          licensePlate: formData.licensePlate,
          vehicleModel: formData.vehicleModel,
          vehicleYear: formData.vehicleYear,
          imageUrl: formData.imageUrl || undefined,
          status: backendStatus,
        });
      }
      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedVehicle(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu xe");
    }
  };

  /**
   * Định dạng ngày tháng theo định dạng Việt Nam
   * @param dateString - Chuỗi ngày tháng cần định dạng
   * @returns Chuỗi ngày tháng đã định dạng
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <PageMeta title="Admin | Quản Lý Xe" />
      <PageHeader
        title="Quản Lý Xe"
        description="Thêm, chỉnh sửa, xóa xe và theo dõi trạng thái của chúng trên tất cả các nhóm đồng sở hữu."
        actions={<Button size="sm" onClick={handleCreate}>Thêm Xe</Button>}
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải danh sách xe...</p>
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
              <p className="text-gray-600 dark:text-gray-400">Không tìm thấy xe nào.</p>
            </div>
          ) : (
            vehicles.map((vehicle) => {
              // Map backend status string to frontend status number
              const statusNumber = mapBackendStatusToFrontend(vehicle.status);
              const status = getVehicleStatus(statusNumber);
              const activeBookings = getActiveBookings(vehicle.id);
              const allBookings = getVehicleBookings(vehicle.id);

              return (
                <div
                  key={vehicle.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                    <div className="flex items-start gap-4">
                      {vehicle.imageUrl && (
                        <div className="flex-shrink-0">
                          <img 
                            src={vehicle.imageUrl} 
                            alt={vehicle.vehicleName}
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
                              {vehicle.vehicleName}
                            </h3>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {vehicle.name} • {vehicle.licensePlate || "Không có biển số"}
                          </p>
                          {vehicle.vehicleModel && vehicle.vehicleYear && (
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              {vehicle.vehicleModel} • {vehicle.vehicleYear}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(vehicle)}>
                            Chỉnh Sửa
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Trạng Thái Đặt Chỗ
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p>Đặt chỗ đang hoạt động: {activeBookings.length}</p>
                          <p>Tổng đặt chỗ: {allBookings.length}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Hoạt Động Gần Đây
                        </h4>
                        {activeBookings.length > 0 ? (
                          <div className="space-y-1 text-sm">
                            {activeBookings.slice(0, 2).map((booking) => (
                              <p key={booking.id} className="text-gray-600 dark:text-gray-400">
                                Đang sử dụng đến {formatDate(booking.endTime)}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Không có đặt chỗ đang hoạt động</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Tạo Xe */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setFormData({
            name: "",
            description: "",
            vehicleName: "",
            licensePlate: "",
            vehicleModel: "",
            vehicleYear: "",
            imageUrl: "",
            status: 0,
          });
        }}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Thêm Xe Mới
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Tạo một nhóm xe mới cho đồng sở hữu.
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
                  {VEHICLE_STATUSES.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
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

            <div>
              <Label>URL Ảnh Xe</Label>
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

            <div className="flex items-center gap-3 lg:justify-end mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setFormData({
                    name: "",
                    description: "",
                    vehicleName: "",
                    licensePlate: "",
                    vehicleModel: "",
                    vehicleYear: "",
                    imageUrl: "",
                    status: 0,
                  });
                }}
              >
                Hủy
              </Button>
              <Button size="sm" onClick={handleSave}>
                Tạo Xe
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Chỉnh Sửa Xe */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedVehicle(null);
        }}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Chỉnh Sửa Xe
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Cập nhật thông tin xe và trạng thái.
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
                  {VEHICLE_STATUSES.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
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
                  setSelectedVehicle(null);
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

export default ManageVehicles;
