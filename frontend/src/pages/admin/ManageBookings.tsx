/**
 * Trang quản lý đặt chỗ
 * Cho phép admin giám sát lịch sử đặt chỗ, phát hiện xung đột và can thiệp trong các trường hợp đặc biệt
 */
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService, Booking } from "../../services/bookingService";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";

const ManageBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<VehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "conflicts" | "pending">("all");

  // Load dữ liệu khi component mount
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Tải danh sách bookings và vehicles từ API
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bookingsData, vehiclesData] = await Promise.all([
        bookingService.getBookings(),
        ownershipService.getGroups(),
      ]);
      setBookings(bookingsData);
      setVehicles(vehiclesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách đặt chỗ");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Lấy tên xe từ vehicleId
   * @param vehicleId - ID của xe
   * @returns Tên xe hoặc ID ngắn nếu không tìm thấy
   */
  const getVehicleName = (vehicleId: string | number) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId.toString());
    return vehicle?.vehicleName || vehicleId.toString().substring(0, 8);
  };

  /**
   * Phát hiện các booking xung đột (trùng lịch)
   * @returns Danh sách các booking có xung đột
   */
  const detectConflicts = (): Booking[] => {
    const conflicts: Booking[] = [];
    // Backend statuses: "Pending", "Confirmed", "Approved", "Đã đặt", "InProgress", "Completed", "Cancelled", "NoShow"
    const activeStatuses = ["confirmed", "approved", "inprogress", "in-progress", "đã đặt"];
    const activeBookings = bookings.filter((b) => {
      const statusLower = b.status.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
      return activeStatuses.some(s => statusLower.includes(s));
    });

    for (let i = 0; i < activeBookings.length; i++) {
      for (let j = i + 1; j < activeBookings.length; j++) {
        const b1 = activeBookings[i];
        const b2 = activeBookings[j];
        if (b1.vehicleId === b2.vehicleId) {
          const start1 = new Date(b1.startTime);
          const end1 = new Date(b1.endTime);
          const start2 = new Date(b2.startTime);
          const end2 = new Date(b2.endTime);

          if (start1 <= end2 && start2 <= end1) {
            if (!conflicts.find((c) => c.id === b1.id)) conflicts.push(b1);
            if (!conflicts.find((c) => c.id === b2.id)) conflicts.push(b2);
          }
        }
      }
    }
    return conflicts;
  };

  /**
   * Lọc bookings theo filter
   * @returns Danh sách bookings đã lọc
   */
  const filteredBookings = () => {
    switch (filter) {
      case "active": {
        // Active statuses: Confirmed, Approved, InProgress, Đã đặt
        const activeStatuses = ["confirmed", "approved", "inprogress", "in-progress", "đã đặt"];
        return bookings.filter((b) => {
          const statusLower = b.status.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
          return activeStatuses.some(s => statusLower.includes(s));
        });
      }
      case "conflicts":
        return detectConflicts();
      case "pending": {
        // Pending status: Pending
        return bookings.filter((b) => {
          const statusLower = b.status.toLowerCase().trim();
          return statusLower === "pending";
        });
      }
      default:
        return bookings;
    }
  };

  /**
   * Lấy màu hiển thị cho trạng thái booking
   * @param status - Trạng thái booking
   * @returns Class CSS cho màu
   */
  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "confirmed" || s === "in-progress")
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300";
    if (s === "pending")
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
    if (s === "cancelled")
      return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
    return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
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

  /**
   * Can thiệp vào booking (hủy booking)
   * @param bookingId - ID của booking cần can thiệp
   */
  const handleIntervene = async (bookingId: number) => {
    if (!confirm("Bạn có chắc chắn muốn hủy đặt chỗ này không?")) return;
    try {
      await bookingService.cancelBooking(bookingId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hủy đặt chỗ");
    }
  };

  return (
    <>
      <PageMeta title="Admin | Quản Lý Đặt Chỗ" />
      <PageHeader
        title="Quản Lý Đặt Chỗ"
        description="Giám sát lịch sử đặt chỗ, phát hiện xung đột và can thiệp trong các trường hợp đặc biệt."
        actions={<Button size="sm" onClick={loadData} disabled={loading}>Làm Mới</Button>}
      />

      {/* Bộ lọc */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "primary" : "outline"}
          onClick={() => setFilter("all")}
        >
          Tất Cả ({bookings.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "active" ? "primary" : "outline"}
          onClick={() => setFilter("active")}
        >
          Đang Hoạt Động ({bookings.filter((b) => {
            const statusLower = b.status.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
            return ["confirmed", "approved", "inprogress", "in-progress", "đã đặt"].some(s => statusLower.includes(s));
          }).length})
        </Button>
        <Button
          size="sm"
          variant={filter === "conflicts" ? "primary" : "outline"}
          onClick={() => setFilter("conflicts")}
        >
          Xung Đột ({detectConflicts().length})
        </Button>
        <Button
          size="sm"
          variant={filter === "pending" ? "primary" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Chờ Xử Lý ({bookings.filter((b) => b.status.toLowerCase().trim() === "pending").length})
        </Button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải danh sách đặt chỗ...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {filteredBookings().length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">Không tìm thấy đặt chỗ nào.</p>
            </div>
          ) : (
            filteredBookings().map((booking) => {
              const isConflict = detectConflicts().some((c) => c.id === booking.id);
              return (
                <div
                  key={booking.id}
                  className={`overflow-hidden rounded-2xl border shadow-theme-xs ${
                    isConflict
                      ? "border-error-200 bg-error-50 dark:border-error-500/40 dark:bg-error-500/10"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                  }`}
                >
                  <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                            Đặt Chỗ #{booking.id}
                          </h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                          {isConflict && (
                            <span className="rounded-full bg-error-500 px-3 py-1 text-xs font-semibold text-white">
                              XUNG ĐỘT
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Xe: {getVehicleName(booking.vehicleId.toString())} • CoOwner: {booking.coOwnerId || "Không xác định"}
                        </p>
                      </div>
                      {isConflict && (
                        <Button size="sm" variant="outline" onClick={() => handleIntervene(booking.id)}>
                          Can Thiệp
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Lịch Trình
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p>Bắt đầu: {formatDate(booking.startTime)}</p>
                          <p>Kết thúc: {formatDate(booking.endTime)}</p>
                          {booking.checkInTime && <p>Check-in: {formatDate(booking.checkInTime)}</p>}
                          {booking.checkOutTime && <p>Check-out: {formatDate(booking.checkOutTime)}</p>}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Chi Tiết
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p>Tạo lúc: {formatDate(booking.createdAt || booking.startTime)}</p>
                          {booking.note && <p>Ghi chú: {booking.note}</p>}
                        </div>
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

export default ManageBookings;
