/**
 * Trang giám sát đặt chỗ cho Staff
 * Theo dõi các chuyến đi đang hoạt động, phản hồi cảnh báo và phối hợp với đồng sở hữu theo thời gian thực
 */
import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService, Booking } from "../../services/bookingService";
import CheckOutModal from "../../components/modals/CheckOutModal";

const MonitorBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "completed">("all");
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  /**
   * Tải danh sách bookings khi component mount và tự động làm mới mỗi 30 giây
   */
  useEffect(() => {
    loadBookings();
    // Tự động làm mới mỗi 30 giây
    const interval = setInterval(loadBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Tải danh sách bookings từ API
   */
  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingService.getBookings();
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách đặt chỗ");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Lọc bookings theo filter đã chọn
   * @returns Danh sách bookings đã lọc
   */
  const filteredBookings = bookings.filter((booking) => {
    if (filter === "all") return true;
    const statusLower = booking.status.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);

    if (filter === "active") {
      // Active: InProgress, Confirmed (đang trong khoảng thời gian), Approved
      const isActiveStatus = ["inprogress", "confirmed", "approved", "đãđặt"].some(s => statusLower.includes(s));
      return isActiveStatus && startTime <= now && endTime >= now;
    }
    if (filter === "upcoming") {
      // Upcoming: Pending, Confirmed, Approved (chưa bắt đầu)
      const isUpcomingStatus = ["pending", "confirmed", "approved"].some(s => statusLower.includes(s));
      return isUpcomingStatus && startTime > now;
    }
    if (filter === "completed") {
      // Completed: Completed, Checked-out
      return statusLower.includes("completed") || statusLower.includes("checkedout");
    }
    return true;
  });

  /**
   * Định dạng ngày giờ theo định dạng Việt Nam
   * @param dateString - Chuỗi ngày giờ
   * @returns Ngày giờ đã định dạng
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
   * Lấy màu hiển thị cho trạng thái booking
   * @param status - Trạng thái booking
   * @returns CSS classes cho màu
   */
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "confirmed" || statusLower === "pending") {
      return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
    }
    if (statusLower === "in-progress" || statusLower === "checked-in") {
      return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300";
    }
    if (statusLower === "completed" || statusLower === "checked-out") {
      return "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    }
    return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
  };

  /**
   * Lấy trạng thái thời gian của booking
   * @param booking - Booking cần kiểm tra
   * @returns Chuỗi mô tả trạng thái thời gian
   */
  const getTimeStatus = (booking: Booking) => {
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);

    if (now < startTime) {
      const diff = startTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `Bắt đầu sau ${hours}h ${minutes}m`;
    }
    if (now >= startTime && now <= endTime) {
      return "Đang diễn ra";
    }
    if (now > endTime) {
      return "Đã kết thúc";
    }
    return "";
  };

  /**
   * Kiểm tra xem có thể check-out không
   * @param booking - Booking cần kiểm tra
   * @returns true nếu có thể check-out
   */
  const canCheckOut = (booking: Booking) => {
    // Phải đã check-in và chưa check-out
    if (!booking.checkInTime || booking.checkOutTime) {
      return false;
    }
    
    // Status phải là confirmed, in-progress, hoặc checked-in
    const status = booking.status?.toLowerCase() || "";
    const allowedStatuses = ["confirmed", "in-progress", "inprogress", "checked-in", "checkedin"];
    
    return allowedStatuses.some(s => status.includes(s));
  };

  /**
   * Xử lý khi click nút check-out
   * @param booking - Booking cần check-out
   */
  const handleCheckOut = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCheckOutModal(true);
  };

  /**
   * Xử lý sau khi check-out thành công
   */
  const handleCheckOutSuccess = () => {
    loadBookings();
    setShowCheckOutModal(false);
    setSelectedBooking(null);
  };

  return (
    <>
      <PageMeta title="Nhân viên | Giám Sát Đặt Chỗ" />
      <PageHeader
        title="Giám Sát Đặt Chỗ"
        description="Theo dõi các chuyến đi đang hoạt động, phản hồi cảnh báo và phối hợp với đồng sở hữu theo thời gian thực."
        actions={
          <Button size="sm" onClick={loadBookings} disabled={loading}>
            Làm Mới
          </Button>
        }
      />

      {/* Bộ Lọc */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "primary" : "outline"}
          onClick={() => setFilter("all")}
        >
          Tất Cả
        </Button>
        <Button
          size="sm"
          variant={filter === "active" ? "primary" : "outline"}
          onClick={() => setFilter("active")}
        >
          Đang Hoạt Động
        </Button>
        <Button
          size="sm"
          variant={filter === "upcoming" ? "primary" : "outline"}
          onClick={() => setFilter("upcoming")}
        >
          Sắp Tới
        </Button>
        <Button
          size="sm"
          variant={filter === "completed" ? "primary" : "outline"}
          onClick={() => setFilter("completed")}
        >
          Hoàn Thành
        </Button>
      </div>

      {/* Danh Sách Đặt Chỗ */}
      {loading && !bookings.length ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Đang tải danh sách đặt chỗ...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-200">{error}</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Không tìm thấy đặt chỗ nào</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      Đặt Chỗ #{booking.id}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getTimeStatus(booking)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                    <div>
                      <span className="font-medium">Xe:</span> {booking.vehicleName || `Xe #${booking.vehicleId}`}
                    </div>
                    <div>
                      <span className="font-medium">Đồng sở hữu:</span> {booking.coOwnerName || `Đồng sở hữu #${booking.coOwnerId}`}
                    </div>
                    <div>
                      <span className="font-medium">Bắt đầu:</span> {formatDate(booking.startTime)}
                    </div>
                    <div>
                      <span className="font-medium">Kết thúc:</span> {formatDate(booking.endTime)}
                    </div>
                    {booking.checkInTime && (
                      <div>
                        <span className="font-medium">Check-in:</span> {formatDate(booking.checkInTime)}
                      </div>
                    )}
                    {booking.checkOutTime && (
                      <div>
                        <span className="font-medium">Check-out:</span> {formatDate(booking.checkOutTime)}
                      </div>
                    )}
                    {booking.distanceKm && (
                      <div>
                        <span className="font-medium">Quãng đường:</span> {booking.distanceKm} km
                      </div>
                    )}
                    {booking.cost && (
                      <div>
                        <span className="font-medium">Chi phí:</span> ₫{booking.cost.toLocaleString()}
                      </div>
                    )}
                  </div>
                  {booking.note && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Ghi chú:</span> {booking.note}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  {canCheckOut(booking) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckOut(booking)}
                    >
                      Check Out
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Check-Out Modal */}
      {selectedBooking && (
        <CheckOutModal
          isOpen={showCheckOutModal}
          onClose={() => {
            setShowCheckOutModal(false);
            setSelectedBooking(null);
          }}
          onSuccess={handleCheckOutSuccess}
          booking={selectedBooking}
        />
      )}
    </>
  );
};

export default MonitorBookings;
