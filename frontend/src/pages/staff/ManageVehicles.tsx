/**
 * Trang quản lý xe cho Staff
 * Xem danh sách xe và cập nhật trạng thái xe cho các nhóm được giao
 */
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";
import Select from "../../components/form/Select";

/**
 * Danh sách trạng thái xe
 */
const VEHICLE_STATUSES = [
  { id: 0, label: "Có Sẵn", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" },
  { id: 1, label: "Đang Sử Dụng", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300" },
  { id: 2, label: "Bảo Dưỡng", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" },
  { id: 3, label: "Sự Cố Kỹ Thuật", color: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300" },
];

const ManageVehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Store frontend status for each vehicle to preserve user selection
  const [vehicleStatusMap, setVehicleStatusMap] = useState<Map<string, number>>(new Map());

  /**
   * Tải danh sách xe khi component mount
   */
  useEffect(() => {
    loadVehicles();
  }, []);

  /**
   * Tải danh sách xe từ API
   */
  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ownershipService.getGroups();
      setVehicles(data);
      // Khởi tạo status map từ dữ liệu backend, nhưng giữ lại các lựa chọn hiện có
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
      setError(err instanceof Error ? err.message : "Không thể tải danh sách xe");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý khi thay đổi trạng thái xe
   * @param vehicleId - ID của xe
   * @param newStatus - Trạng thái mới (0-3)
   */
  const handleStatusChange = async (vehicleId: string, newStatus: number) => {
    try {
      setError(null);
      // Map frontend status (0-3) sang backend GroupStatus
      const backendStatus = mapFrontendStatusToBackend(newStatus);
      
      // Cập nhật status map ngay lập tức để UX tốt hơn
      setVehicleStatusMap(prev => {
        const newMap = new Map(prev);
        newMap.set(vehicleId, newStatus);
        return newMap;
      });
      
      // Gọi API để cập nhật status trong database
      await ownershipService.updateGroupStatus(vehicleId, backendStatus);
      
      // Không reload ngay - giữ status đã chọn hiển thị
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái xe");
      // Hoàn nguyên status khi có lỗi
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

  /**
   * Map backend status string sang frontend status number
   * @param backendStatus - Status từ backend ("Active", "Inactive", "Dissolved")
   * @param currentFrontendStatus - Status hiện tại từ frontend (nếu có)
   * @returns Số status (0-3)
   */
  const mapBackendStatusToFrontend = (backendStatus: string | number, currentFrontendStatus?: number): number => {
    // Nếu có frontend status hiện tại (từ local state), ưu tiên nó
    if (currentFrontendStatus !== undefined) {
      return currentFrontendStatus;
    }
    
    if (typeof backendStatus === 'number') {
      return backendStatus;
    }
    // Backend trả về: "Active", "Inactive", "Dissolved"
    // Frontend cần: 0=Có Sẵn, 1=Đang Sử Dụng, 2=Bảo Dưỡng, 3=Sự Cố Kỹ Thuật
    // Map: Active -> 0 (Có Sẵn), Inactive -> 2 (Bảo Dưỡng)
    const statusMap: Record<string, number> = {
      'Active': 0,      // Có Sẵn
      'Inactive': 2,    // Bảo Dưỡng
      'Dissolved': 3,   // Sự Cố Kỹ Thuật
    };
    return statusMap[backendStatus] ?? 0;
  };

  /**
   * Map frontend status number sang backend status string
   * @param frontendStatus - Số status từ frontend (0-3)
   * @returns Status string cho backend
   */
  const mapFrontendStatusToBackend = (frontendStatus: number): string => {
    const statusMap: Record<number, string> = {
      0: "Active",   // Có Sẵn -> Active
      1: "Active",   // Đang Sử Dụng -> Active
      2: "Inactive", // Bảo Dưỡng -> Inactive
      3: "Inactive", // Sự Cố Kỹ Thuật -> Inactive
    };
    return statusMap[frontendStatus] || "Active";
  };

  /**
   * Lấy thông tin status từ ID
   * @param status - Số status (0-3)
   * @returns Thông tin status (label, color)
   */
  const getStatus = (status: number) => {
    return VEHICLE_STATUSES.find((s) => s.id === status) || VEHICLE_STATUSES[0];
  };

  return (
    <>
      <PageMeta title="Nhân viên | Quản Lý Xe" />
      <PageHeader
        title="Quản Lý Xe"
        description="Xem danh sách xe và cập nhật trạng thái xe cho các nhóm được giao."
        actions={<Button size="sm" onClick={loadVehicles} disabled={loading}>Làm Mới</Button>}
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
              // Lấy status từ map (giữ lại lựa chọn của user) hoặc map từ backend
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
                          {vehicle.name} • {vehicle.licensePlate || "Không có biển số"}
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
                          Cập Nhật Trạng Thái
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

