import { useEffect, useState, FormEvent } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { ownershipService, VehicleGroup, Ownership } from "../../services/ownershipService";
import { bookingService, CreateBookingRequest } from "../../services/bookingService";
import { BookingNeedType } from "../../components/modals/BookingNeedModal";
import { generateOwnerCode } from "../../utils/ownerCode";
import OwnerCodeDisplay from "../../components/common/OwnerCodeDisplay";

interface VehicleWithOwners extends VehicleGroup {
  ownerships: Ownership[];
  totalOwners: number;
  companyOwnership: number;
  currentUserOwnership?: Ownership;
  vehicleId?: number; // Booking service vehicle ID
}

/**
 * Trang chọn xe - chọn xe phù hợp với nhu cầu đặt xe (ngắn hạn, dài hạn, lâu dài)
 */
const VehicleSelection: React.FC<{
  needType: BookingNeedType;
  duration: number;
  onBack: () => void;
}> = ({ needType, duration, onBack }) => {
  const [vehicles, setVehicles] = useState<VehicleWithOwners[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<{ [vehicleId: string]: { startTime: string; endTime: string; note: string } }>({});
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<{ vehicleId: string; bookingId: number; ownerCode: string; vehicleName?: string; vehicleModel?: string } | null>(null);

  /**
   * Tải danh sách xe khi needType thay đổi
   */
  useEffect(() => {
    loadVehicles();
  }, [needType]);

  /**
   * Tải danh sách xe phù hợp với nhu cầu
   */
  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Lấy user ID hiện tại
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        throw new Error("Không tìm thấy user. Vui lòng đăng nhập lại.");
      }

      // Lấy co-owner theo userId
      const coOwner = await ownershipService.getCoOwnerByUserId(userId);
      if (!coOwner) {
        throw new Error("Không tìm thấy co-owner. Vui lòng đảm bảo bạn đã hoàn thành KYC.");
      }

      // Get all ownerships for this co-owner
      const allOwnerships = await ownershipService.getOwnerships(undefined, coOwner.id, true);
      
      // Get unique group IDs from ownerships
      const groupIds = [...new Set(allOwnerships.map(o => o.vehicleGroupId))];
      
      // Get groups for these IDs
      const allGroups = await ownershipService.getGroups();
      const userGroups = allGroups.filter(g => groupIds.includes(g.id));

      // Also load vehicles from booking service for vehicleId mapping
      const vehiclesFromBooking = await bookingService.getVehicles();
      
      // Load ownerships for each group and build vehicle list
      const vehiclesWithOwnersPromises = userGroups.map(async (group) => {
        try {
          const ownerships = await ownershipService.getOwnerships(group.id);
          
          // Find current user's ownership
          const currentUserOwnership = ownerships.find(o => o.coOwnerId === coOwner.id);
          
          // Filter based on need type
          let shouldInclude = false;
          if (needType === "NH") {
            // Ngắn hạn: nhiều người đồng sở hữu (>= 3)
            shouldInclude = ownerships.length >= 3;
          } else if (needType === "DH") {
            // Dài hạn: 2-3 người đồng sở hữu
            shouldInclude = ownerships.length >= 2 && ownerships.length <= 3;
          } else if (needType === "LD") {
            // Lâu dài: 2 người (1 người + công ty 10%)
            shouldInclude = ownerships.length === 2;
          }

          if (shouldInclude) {
            // Calculate company ownership (10%)
            const companyOwnership = 10;
            
            // Find matching vehicle ID from booking service by name
            const matchingVehicle = vehiclesFromBooking.find(v => 
              v.name.toLowerCase() === group.vehicleName.toLowerCase()
            );
            
            return {
              ...group,
              ownerships,
              totalOwners: ownerships.length,
              companyOwnership,
              currentUserOwnership,
              vehicleId: matchingVehicle?.id,
            } as VehicleWithOwners;
          }
          return null;
        } catch (err) {
          console.error(`Failed to load ownerships for group ${group.id}:`, err);
          return null;
        }
      });

      const vehiclesWithOwnersResults = await Promise.all(vehiclesWithOwnersPromises);
      const validVehicles = vehiclesWithOwnersResults.filter((v): v is VehicleWithOwners => v !== null);
      setVehicles(validVehicles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách xe");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300";
    if (status === 1) return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
    if (status === 2) return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
    return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300";
  };

  /**
   * Lấy nhãn trạng thái xe (tiếng Việt)
   * @param status - Trạng thái xe (0=Available, 1=In Use, 2=Maintenance, 3=Technical Issue)
   * @returns Nhãn trạng thái
   */
  const getStatusLabel = (status: number) => {
    if (status === 0) return "Có sẵn";
    if (status === 1) return "Đang sử dụng";
    if (status === 2) return "Bảo dưỡng";
    return "Sự cố kỹ thuật";
  };

  const handleBookClick = (vehicleId: string) => {
    if (expandedVehicleId === vehicleId) {
      setExpandedVehicleId(null);
    } else {
      setExpandedVehicleId(vehicleId);
      // Initialize booking data if not exists
      if (!bookingData[vehicleId]) {
        const now = new Date();
        const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const end = new Date(start.getTime() + duration * 60 * 60 * 1000); // duration hours later
        
        setBookingData({
          ...bookingData,
          [vehicleId]: {
            startTime: start.toISOString().slice(0, 16),
            endTime: end.toISOString().slice(0, 16),
            note: "",
          },
        });
      }
    }
  };

  const handleBookingSubmit = async (e: FormEvent, vehicle: VehicleWithOwners) => {
    e.preventDefault();
    
    if (!vehicle.vehicleId) {
      setError("Không tìm thấy ID xe. Không thể tạo đặt chỗ.");
      return;
    }

    const bookingInfo = bookingData[vehicle.id];
    if (!bookingInfo) {
      setError("Vui lòng điền thông tin đặt chỗ.");
      return;
    }

    try {
      setBookingLoading(vehicle.id);
      setError(null);

      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        throw new Error("Không tìm thấy người dùng. Vui lòng đăng nhập lại.");
      }

      const start = new Date(bookingInfo.startTime);
      const end = new Date(bookingInfo.endTime);

      if (end <= start) {
        throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
      }

      const coOwnerIdNum = parseInt(userId);
      if (isNaN(coOwnerIdNum)) {
        throw new Error("ID người dùng không hợp lệ");
      }

      const data: CreateBookingRequest = {
        vehicleId: vehicle.vehicleId,
        coOwnerId: coOwnerIdNum,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        note: bookingInfo.note || undefined,
      };

      const booking = await bookingService.createBooking(data);
      
      // Dispatch custom event để các component khác có thể refresh
      const bookingCreatedEvent = new CustomEvent('bookingCreated', {
        detail: {
          bookingId: booking.id,
          vehicleId: booking.vehicleId,
        }
      });
      window.dispatchEvent(bookingCreatedEvent);
      
      // Set session storage flag để refresh khi quay lại trang
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bookingJustCreated', 'true');
      }
      
      if (booking) {
        // Generate owner code
        const vehicleModel = vehicle.vehicleModel || vehicle.vehicleName || "UNK";
        const ownerCode = generateOwnerCode(needType, vehicleModel, new Date(), booking.id % 99 + 1);
        
        setCreatedBooking({
          vehicleId: vehicle.id,
          bookingId: booking.id,
          ownerCode,
          vehicleName: vehicle.vehicleName,
          vehicleModel: vehicle.vehicleModel,
        });
        
        // Reset form
        setBookingData({
          ...bookingData,
          [vehicle.id]: {
            startTime: "",
            endTime: "",
            note: "",
          },
        });
        setExpandedVehicleId(null);
        loadVehicles();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo booking");
    } finally {
      setBookingLoading(null);
    }
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getNeedTypeLabel = () => {
    switch (needType) {
      case "NH":
        return "Ngắn hạn";
      case "DH":
        return "Dài hạn";
      case "LD":
        return "Lâu dài";
      default:
        return "";
    }
  };

  return (
    <>
      <PageMeta title="Đồng sở hữu | Chọn Xe" />
      <PageHeader
        title={`Chọn Xe - ${getNeedTypeLabel()}`}
        description={
          needType === "NH"
            ? "Nhiều người đồng sở hữu, hạn chế xe do nhu cầu cao"
            : needType === "DH"
            ? "2-3 người đồng sở hữu, số lượng xe tương đối"
            : "2 người sở hữu (1 người dùng + công ty 10%)"
        }
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            Quay lại
          </Button>
        }
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

      {createdBooking && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-6 shadow-theme-xs dark:border-green-500/40 dark:bg-green-500/10">
          <div className="mb-4">
            <h3 className="mb-2 text-lg font-semibold text-green-900 dark:text-green-200">
              Đặt xe thành công!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Booking ID: {createdBooking.bookingId}
            </p>
          </div>
          <OwnerCodeDisplay
            ownerCode={createdBooking.ownerCode}
            vehicleName={createdBooking.vehicleName}
            vehicleModel={createdBooking.vehicleModel}
            status="Available"
          />
          <Button
            size="sm"
            className="mt-4"
            onClick={() => {
              setCreatedBooking(null);
              loadVehicles();
            }}
          >
            Đóng
          </Button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">
                Không tìm thấy xe phù hợp với nhu cầu {getNeedTypeLabel()}.
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                Bạn chưa có quyền sở hữu xe nào phù hợp.
              </p>
            </div>
          ) : (
            vehicles.map((vehicle) => {
              const isExpanded = expandedVehicleId === vehicle.id;
              const vehicleStatus = typeof vehicle.status === 'string' ? (parseInt(vehicle.status) || 0) : vehicle.status;
              const bookingInfo = bookingData[vehicle.id] || { startTime: "", endTime: "", note: "" };
              const isBookingLoading = bookingLoading === vehicle.id;
              
              return (
                <div
                  key={vehicle.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                >
                  {/* Vehicle Image Placeholder */}
                  <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🚗</div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {vehicle.vehicleName}
                      </p>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                        {vehicle.vehicleName}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(vehicleStatus)}`}>
                        {getStatusLabel(vehicleStatus)}
                      </span>
                    </div>

                    {vehicle.licensePlate && (
                      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                        Biển số: {vehicle.licensePlate}
                      </p>
                    )}

                    {/* Current User Ownership */}
                    {vehicle.currentUserOwnership && (
                      <div className="mb-3 rounded-lg bg-primary-50 p-3 dark:bg-primary-500/10">
                        <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                          Quyền sở hữu của bạn: <span className="font-bold">{vehicle.currentUserOwnership.ownershipPercentage}%</span>
                        </p>
                      </div>
                    )}

                    {/* Co-owners List */}
                    <div className="mb-3">
                      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Đồng sở hữu ({vehicle.totalOwners} người):
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {vehicle.ownerships.map((ownership) => (
                          <div
                            key={ownership.id}
                            className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800/30"
                          >
                            <span className="text-gray-600 dark:text-gray-400">
                              {ownership.coOwnerName || ownership.coOwnerId.substring(0, 8)}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white/90">
                              {ownership.ownershipPercentage}%
                            </span>
                          </div>
                        ))}
                        {/* Company ownership */}
                        <div className="flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-xs dark:bg-blue-500/10">
                          <span className="text-blue-600 dark:text-blue-300">Công ty</span>
                          <span className="font-medium text-blue-700 dark:text-blue-200">
                            {vehicle.companyOwnership}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isExpanded && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleBookClick(vehicle.id)}
                        disabled={vehicleStatus !== 0}
                      >
                        {vehicleStatus === 0 ? "Đặt Xe" : "Không khả dụng"}
                      </Button>
                    )}

                    {/* Booking Form (Inline) */}
                    {isExpanded && vehicleStatus === 0 && (
                      <form onSubmit={(e) => handleBookingSubmit(e, vehicle)} className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                        <div>
                          <Label>Thời gian bắt đầu *</Label>
                          <Input
                            type="datetime-local"
                            value={bookingInfo.startTime}
                            onChange={(e) => {
                              setBookingData({
                                ...bookingData,
                                [vehicle.id]: {
                                  ...bookingInfo,
                                  startTime: e.target.value,
                                },
                              });
                            }}
                            min={getCurrentDateTime()}
                            required
                          />
                        </div>

                        <div>
                          <Label>Thời gian kết thúc *</Label>
                          <Input
                            type="datetime-local"
                            value={bookingInfo.endTime}
                            onChange={(e) => {
                              setBookingData({
                                ...bookingData,
                                [vehicle.id]: {
                                  ...bookingInfo,
                                  endTime: e.target.value,
                                },
                              });
                            }}
                            min={bookingInfo.startTime || getCurrentDateTime()}
                            required
                          />
                        </div>

                        <div>
                          <Label>Ghi chú (Tùy chọn)</Label>
                          <textarea
                            className="h-20 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden focus:ring-2 focus:ring-brand-300/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            value={bookingInfo.note}
                            onChange={(e) => {
                              setBookingData({
                                ...bookingData,
                                [vehicle.id]: {
                                  ...bookingInfo,
                                  note: e.target.value,
                                },
                              });
                            }}
                            placeholder="Thêm ghi chú..."
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setExpandedVehicleId(null)}
                            disabled={isBookingLoading}
                          >
                            Hủy
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            className="flex-1"
                            disabled={isBookingLoading || !vehicle.vehicleId}
                          >
                            {isBookingLoading ? "Đang đặt..." : "Xác nhận đặt xe"}
                          </Button>
                        </div>
                      </form>
                    )}
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

export default VehicleSelection;
