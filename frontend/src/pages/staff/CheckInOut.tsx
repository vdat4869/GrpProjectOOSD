/**
 * Trang Check-In / Check-Out cho Staff
 * Xác thực mã QR đặt chỗ, xác nhận tình trạng xe và thu thập chữ ký số tại chỗ
 */
import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService, Booking } from "../../services/bookingService";
import CheckInModal from "../../components/modals/CheckInModal";
import CheckOutModal from "../../components/modals/CheckOutModal";

const CheckInOut: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "in-progress" | "completed">("all");

  /**
   * Tải danh sách bookings khi component mount
   */
  useEffect(() => {
    loadBookings();
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
    if (filter === "pending") {
      // Pending: Pending, Confirmed (chưa check-in)
      return statusLower.includes("pending") || (statusLower.includes("confirmed") && !booking.checkInTime);
    }
    if (filter === "confirmed") {
      // Confirmed: Confirmed, Approved
      return statusLower.includes("confirmed") || statusLower.includes("approved");
    }
    if (filter === "in-progress") {
      // In-progress: InProgress, Checked-in
      return statusLower.includes("inprogress") || statusLower.includes("checkedin");
    }
    if (filter === "completed") {
      // Completed: Completed, Checked-out
      return statusLower.includes("completed") || statusLower.includes("checkedout");
    }
    return true;
  });

  /**
   * Kiểm tra xem có thể check-in không
   * @param booking - Booking cần kiểm tra
   * @returns true nếu có thể check-in
   */
  const canCheckIn = (booking: Booking) => {
    const status = booking.status.toLowerCase();
    return (status === "confirmed" || status === "pending") && !booking.checkInTime;
  };

  /**
   * Kiểm tra xem có thể check-out không
   * @param booking - Booking cần kiểm tra
   * @returns true nếu có thể check-out
   */
  const canCheckOut = (booking: Booking) => {
    const status = booking.status.toLowerCase();
    return (status === "in-progress" || status === "checked-in") && booking.checkInTime && !booking.checkOutTime;
  };

  /**
   * Xử lý khi click nút check-in
   * @param booking - Booking cần check-in
   */
  const handleCheckIn = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCheckInModal(true);
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
   * Xử lý sau khi check-in/check-out thành công
   */
  const handleSuccess = () => {
    loadBookings();
    setShowCheckInModal(false);
    setShowCheckOutModal(false);
    setSelectedBooking(null);
  };

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

  return (
    <>
      <PageMeta title="Nhân viên | Check-In / Check-Out" />
      <PageHeader
        title="Check-In / Check-Out"
        description="Xác thực mã QR đặt chỗ, xác nhận tình trạng xe và thu thập chữ ký số tại chỗ."
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
          variant={filter === "pending" ? "primary" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Chờ Check-in
        </Button>
        <Button
          size="sm"
          variant={filter === "confirmed" ? "primary" : "outline"}
          onClick={() => setFilter("confirmed")}
        >
          Đã Xác Nhận
        </Button>
        <Button
          size="sm"
          variant={filter === "in-progress" ? "primary" : "outline"}
          onClick={() => setFilter("in-progress")}
        >
          Đang Sử Dụng
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
      {loading ? (
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
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      Đặt Chỗ #{booking.id}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
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
                <div className="flex flex-col gap-2 lg:flex-row">
                  {canCheckIn(booking) && (
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(booking)}
                      className="w-full lg:w-auto"
                    >
                      Check In
                    </Button>
                  )}
                  {canCheckOut(booking) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckOut(booking)}
                      className="w-full lg:w-auto"
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

      {/* Modals */}
      {selectedBooking && (
        <>
          <CheckInModal
            isOpen={showCheckInModal}
            onClose={() => {
              setShowCheckInModal(false);
              setSelectedBooking(null);
            }}
            onSuccess={handleSuccess}
            booking={selectedBooking}
          />
          <CheckOutModal
            isOpen={showCheckOutModal}
            onClose={() => {
              setShowCheckOutModal(false);
              setSelectedBooking(null);
            }}
            onSuccess={handleSuccess}
            booking={selectedBooking}
          />
        </>
      )}
    </>
  );
};

export default CheckInOut;
