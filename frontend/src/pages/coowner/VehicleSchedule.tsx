import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService, type VehicleSchedule, type BookingPeriod } from "../../services/bookingService";

/**
 * Trang lịch xe - xem lịch sử dụng xe và trạng thái xe
 */
const VehicleSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<VehicleSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  /**
   * Tải lịch xe khi component mount
   */
  useEffect(() => {
    loadSchedules();
  }, []);

  /**
   * Tải danh sách lịch xe từ API
   */
  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingService.getSchedules();
      setSchedules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải lịch xe");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Định dạng ngày giờ theo định dạng Việt Nam
   * @param dateString - Chuỗi ngày giờ
   * @returns Ngày giờ đã định dạng
   */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Định dạng ngày tháng
   * @param date - Đối tượng Date
   * @returns Ngày tháng đã định dạng
   */
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  /**
   * Lấy màu hiển thị cho trạng thái booking
   * @param status - Trạng thái booking
   * @param isCurrentlyInUse - Xe có đang được sử dụng không
   * @returns CSS classes cho màu
   */
  const getStatusColor = (status: string | undefined, isCurrentlyInUse: boolean | undefined) => {
    if (isCurrentlyInUse) {
      return "bg-error-500 text-white";
    }
    switch (status?.toLowerCase()) {
      case "confirmed":
      case "đã đặt":
        return "bg-primary-500 text-white";
      case "in-progress":
      case "đang sử dụng":
        return "bg-warning-500 text-white";
      case "completed":
      case "hoàn thành":
        return "bg-success-500 text-white";
      case "cancelled":
      case "đã hủy":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  /**
   * Lấy nhãn trạng thái xe
   * @param isCurrentlyInUse - Xe có đang được sử dụng không
   * @returns Nhãn trạng thái
   */
  const getStatusLabel = (isCurrentlyInUse: boolean | undefined) => {
    return isCurrentlyInUse ? "Đang sử dụng" : "Trống";
  };

  /**
   * Kiểm tra xem booking có nằm trong ngày đã chọn không
   * @param booking - Booking period
   * @param date - Ngày đã chọn
   * @returns true nếu booking nằm trong ngày đã chọn
   */
  const isBookingOnSelectedDate = (booking: BookingPeriod, date: Date) => {
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);
    const selectedStart = new Date(date);
    selectedStart.setHours(0, 0, 0, 0);
    const selectedEnd = new Date(date);
    selectedEnd.setHours(23, 59, 59, 999);

    return (
      (bookingStart >= selectedStart && bookingStart <= selectedEnd) ||
      (bookingEnd >= selectedStart && bookingEnd <= selectedEnd) ||
      (bookingStart <= selectedStart && bookingEnd >= selectedEnd)
    );
  };

  const filteredSchedules = schedules.map((schedule) => ({
    ...schedule,
    bookings: schedule.bookings.filter((booking) =>
      isBookingOnSelectedDate(booking, selectedDate)
    ),
  }));

  return (
    <>
      <PageMeta title="Đồng sở hữu | Lịch Xe" />
      <PageHeader
        title="Lịch Xe"
        description="Xem lịch sử dụng xe và trạng thái xe đang trống/đang dùng"
        actions={
          <Button size="sm" onClick={loadSchedules} disabled={loading}>
            Làm mới
          </Button>
        }
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải lịch xe...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Date Filter */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Chọn ngày:
            </label>
            <input
              type="date"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            />
          </div>

          {/* Vehicle Schedules */}
          <div className="grid gap-6">
            {filteredSchedules.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                <p className="text-gray-600 dark:text-gray-400">Không có xe nào trong hệ thống.</p>
              </div>
            ) : (
              filteredSchedules.map((schedule) => (
                <div
                  key={schedule.vehicleId}
                  className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {schedule.vehicleName}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          ID: {schedule.vehicleId}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            schedule.isActive
                              ? schedule.isCurrentlyInUse
                                ? "bg-error-100 text-error-800 dark:bg-error-500/20 dark:text-error-200"
                                : "bg-success-100 text-success-800 dark:bg-success-500/20 dark:text-success-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {schedule.isActive
                            ? getStatusLabel(schedule.isCurrentlyInUse ?? false)
                            : "Không hoạt động"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {schedule.bookings.length === 0 ? (
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        Không có lịch đặt xe cho ngày {formatDate(selectedDate)}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Lịch đặt xe ({schedule.bookings.length}):
                        </h4>
                        {schedule.bookings.map((booking, index) => (
                          <div
                            key={index}
                            className={`rounded-lg border p-3 ${
                              schedule.isCurrentlyInUse &&
                              new Date(booking.startTime) <= new Date() &&
                              new Date(booking.endTime) >= new Date()
                                ? "border-error-300 bg-error-50 dark:border-error-500/40 dark:bg-error-500/10"
                                : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                                      booking.status,
                                      false
                                    )}`}
                                  >
                                    {booking.status || "N/A"}
                                  </span>
                                  {booking.coOwnerName && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {booking.coOwnerName}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                  <p>
                                    <span className="font-medium">Bắt đầu:</span>{" "}
                                    {formatDateTime(booking.startTime)}
                                  </p>
                                  <p>
                                    <span className="font-medium">Kết thúc:</span>{" "}
                                    {formatDateTime(booking.endTime)}
                                  </p>
                                  {booking.note && (
                                    <p className="mt-1 text-gray-500 dark:text-gray-500">
                                      <span className="font-medium">Ghi chú:</span> {booking.note}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
};

export default VehicleSchedule;

