import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService, Booking, CreateBookingRequest } from "../../services/bookingService";
import { ownershipService, VehicleGroup, Ownership } from "../../services/ownershipService";
import { aiService } from "../../services/aiService";
import { BookingSuggestionResponse } from "../../services/aiService";
import UpdateBookingModal from "../../components/modals/UpdateBookingModal";
import CheckInModal from "../../components/modals/CheckInModal";
import CheckOutModal from "../../components/modals/CheckOutModal";
import { Modal } from "../../components/ui/modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

interface VehicleWithOwners extends VehicleGroup {
  ownerships: Ownership[];
  currentUserOwnership?: Ownership;
  vehicleId?: number; // Booking service vehicle ID
}

/**
 * Trang quản lý bookings của Co-owner - xem, tạo, cập nhật, hủy bookings
 */
const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // State cho form tạo booking
  const [availableVehicles, setAvailableVehicles] = useState<VehicleWithOwners[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<BookingSuggestionResponse | null>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  /**
   * Tải danh sách bookings của user
   */
  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const data = await bookingService.getBookings(userId || undefined);
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  /**
   * Tải danh sách xe có sẵn cho user (dựa trên quyền sở hữu)
   */
  const loadAvailableVehicles = async () => {
    try {
      setLoadingVehicles(true);
      setBookingError(null);
      
      // Lấy user ID hiện tại
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        throw new Error("Không tìm thấy user. Vui lòng đăng nhập lại.");
      }

      // Lấy co-owner theo userId
      const coOwner = await ownershipService.getCoOwnerByUserId(userId);
      if (!coOwner) {
        setBookingError("Tài khoản chưa được đăng ký làm co-owner. Vui lòng hoàn thành KYC trước.");
        return;
      }
      console.log("Đã tìm thấy co-owner:", coOwner);

      // Lấy tất cả quyền sở hữu cho co-owner này
      const allOwnerships = await ownershipService.getOwnerships(undefined, coOwner.id, true);
      console.log("Tất cả quyền sở hữu của co-owner:", allOwnerships);
      
      if (allOwnerships.length === 0) {
        setBookingError("Bạn chưa có quyền sở hữu xe nào. Vui lòng liên hệ admin để được thêm vào nhóm sở hữu.");
        return;
      }
      
      // Lấy danh sách group ID duy nhất từ ownerships
      const groupIds = [...new Set(allOwnerships.map(o => o.vehicleGroupId))];
      console.log("Group IDs từ ownerships:", groupIds);
      
      // Lấy groups cho các ID này
      const allGroups = await ownershipService.getGroups();
      const userGroups = allGroups.filter(g => groupIds.includes(g.id));
      console.log("Nhóm xe của user:", userGroups.map(g => ({ id: g.id, name: g.name, vehicleName: g.vehicleName })));
      
      if (userGroups.length === 0) {
        setBookingError("Không tìm thấy nhóm xe tương ứng với quyền sở hữu của bạn. Vui lòng liên hệ admin.");
        return;
      }

      // Tải vehicles từ booking service để map vehicleId
      const vehiclesFromBooking = await bookingService.getVehicles();
      
      // Tải ownerships cho từng group và xây dựng danh sách xe
      const vehiclesWithOwnersPromises = userGroups.map(async (group) => {
        try {
          const ownerships = await ownershipService.getOwnerships(group.id);
          
          // Tìm quyền sở hữu của user hiện tại
          const currentUserOwnership = ownerships.find(o => o.coOwnerId === coOwner.id);
          
          // Tìm vehicle ID khớp từ booking service theo tên
          // Thử nhiều chiến lược khớp
          let matchingVehicle = vehiclesFromBooking.find(v => 
            v.name.toLowerCase() === group.vehicleName.toLowerCase()
          );
          
          // Nếu không tìm thấy, thử khớp theo biển số nếu có
          if (!matchingVehicle && group.licensePlate) {
            matchingVehicle = vehiclesFromBooking.find(v => 
              v.name.toLowerCase().includes(group.licensePlate!.toLowerCase()) ||
              group.licensePlate!.toLowerCase().includes(v.name.toLowerCase())
            );
          }
          
          // Nếu vẫn không tìm thấy, thử khớp một phần tên
          if (!matchingVehicle) {
            matchingVehicle = vehiclesFromBooking.find(v => 
              v.name.toLowerCase().includes(group.vehicleName.toLowerCase()) ||
              group.vehicleName.toLowerCase().includes(v.name.toLowerCase())
            );
          }
          
          // Nếu vẫn không tìm thấy, tự động tạo vehicle trong booking service
          let vehicleId = matchingVehicle?.id;
          if (!vehicleId && group.vehicleName) {
            try {
              console.log(`Đang tạo vehicle "${group.vehicleName}" trong booking service...`);
              const newVehicle = await bookingService.createVehicle(group.vehicleName);
              vehicleId = newVehicle.id;
              console.log(`Đã tạo vehicle thành công với ID: ${vehicleId}`);
            } catch (err) {
              console.error(`Không thể tạo vehicle "${group.vehicleName}":`, err);
              // Tiếp tục mà không có vehicleId - sẽ hiển thị lỗi khi user cố đặt xe
            }
          }
          
          return {
            ...group,
            ownerships,
            currentUserOwnership,
            vehicleId,
          } as VehicleWithOwners;
        } catch (err) {
          console.error(`Không thể tải ownerships cho group ${group.id}:`, err);
          return null;
        }
      });

      const vehiclesWithOwnersResults = await Promise.all(vehiclesWithOwnersPromises);
      // Hiển thị tất cả xe có quyền sở hữu, kể cả khi không tìm thấy vehicleId
      // Điều này cho phép user thấy các nhóm của họ và chúng ta sẽ hiển thị cảnh báo nếu thiếu vehicleId
      const validVehicles = vehiclesWithOwnersResults.filter((v): v is VehicleWithOwners => v !== null);
      setAvailableVehicles(validVehicles);
      
      // Tự động chọn xe đầu tiên nếu có
      if (validVehicles.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(validVehicles[0].id);
      }
      
      // Log để debug
      if (validVehicles.length > 0) {
        console.log("Xe có sẵn:", validVehicles.map(v => ({
          groupId: v.id,
          vehicleName: v.vehicleName,
          vehicleId: v.vehicleId,
          hasVehicleId: v.vehicleId !== undefined
        })));
      }
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Không thể tải danh sách xe");
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    if (showCreateModal) {
      loadAvailableVehicles();
      // Reset form
      setSelectedVehicleId("");
      setStartTime("");
      setEndTime("");
      setNote("");
      setAiSuggestion(null);
      setBookingError(null);
    }
  }, [showCreateModal]);

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  /**
   * Lấy gợi ý từ AI về tính công bằng của booking
   */
  const handleGetAISuggestion = async () => {
    if (!selectedVehicleId || !startTime || !endTime) {
      setBookingError("Vui lòng chọn xe và thời gian trước");
      return;
    }

    try {
      setLoadingAI(true);
      setBookingError(null);
      setAiSuggestion(null);

      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        throw new Error("Không tìm thấy user. Vui lòng đăng nhập lại.");
      }

      const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId);
      if (!selectedVehicle) {
        throw new Error("Xe đã chọn không tồn tại. Vui lòng chọn lại.");
      }
      if (!selectedVehicle.vehicleId) {
        throw new Error(`Xe "${selectedVehicle.vehicleName}" chưa được đồng bộ với hệ thống đặt xe. Vui lòng liên hệ admin để đồng bộ xe này.`);
      }

      // Lấy tỷ lệ sở hữu của user hiện tại
      const ownershipPercentage = selectedVehicle.currentUserOwnership?.ownershipPercentage || 0;

      const suggestion = await aiService.getBookingSuggestion({
        vehicle_group_id: selectedVehicle.id,
        requested_start: new Date(startTime).toISOString(),
        requested_end: new Date(endTime).toISOString(),
        co_owner_id: userId,
        ownership_percentage: ownershipPercentage / 100,
      });

      if (suggestion) {
        setAiSuggestion(suggestion);
        // Tự động áp dụng gợi ý nếu điểm công bằng tốt
        if (suggestion.fairness_score >= 0.7) {
          setStartTime(new Date(suggestion.suggested_start).toISOString().slice(0, 16));
          setEndTime(new Date(suggestion.suggested_end).toISOString().slice(0, 16));
        }
      }
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Không thể lấy gợi ý từ AI");
    } finally {
      setLoadingAI(false);
    }
  };

  /**
   * Tạo booking mới
   */
  const handleCreateBooking = async () => {
    if (!selectedVehicleId || !startTime || !endTime) {
      setBookingError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setCreatingBooking(true);
      setBookingError(null);

      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        throw new Error("Không tìm thấy user. Vui lòng đăng nhập lại.");
      }

      const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId);
      if (!selectedVehicle) {
        throw new Error("Xe đã chọn không tồn tại. Vui lòng chọn lại.");
      }
      if (!selectedVehicle.vehicleId) {
        throw new Error(`Xe "${selectedVehicle.vehicleName}" chưa được đồng bộ với hệ thống đặt xe. Vui lòng liên hệ admin để đồng bộ xe này.`);
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (end <= start) {
        throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
      }

      // Kiểm tra AI suggestion trước nếu chưa kiểm tra
      if (!aiSuggestion) {
        setBookingError("Vui lòng kiểm tra AI trước khi đặt xe");
        return;
      }

      // Check if AI approves
      // Calculate booking duration in hours
      const bookingDurationHours = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
      // Use lower threshold (0.3) for short bookings (< 1 hour), higher threshold (0.5) for longer bookings
      const threshold = bookingDurationHours < 1.0 ? 0.3 : 0.5;
      
      if (aiSuggestion.fairness_score < threshold) {
        // For very short bookings (< 15 minutes), allow with warning
        if (bookingDurationHours < 0.25) {
          // Allow but show warning
          setBookingError(`Cảnh báo: Điểm công bằng thấp (${(aiSuggestion.fairness_score * 100).toFixed(1)}%). ${aiSuggestion.reason}`);
        } else {
          setBookingError(`Đặt xe không được AI chấp nhận. Lý do: ${aiSuggestion.reason}. Điểm công bằng: ${(aiSuggestion.fairness_score * 100).toFixed(1)}%`);
          return;
        }
      }

      const coOwnerIdNum = parseInt(userId);
      if (isNaN(coOwnerIdNum)) {
        throw new Error("ID người dùng không hợp lệ");
      }

      const data: CreateBookingRequest = {
        vehicleId: selectedVehicle.vehicleId,
        coOwnerId: coOwnerIdNum,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        note: note || undefined,
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
      
      // Reset form and close modal
      setSelectedVehicleId("");
      setStartTime("");
      setEndTime("");
      setNote("");
      setAiSuggestion(null);
      setShowCreateModal(false);
      await loadBookings();
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Không thể tạo đặt chỗ");
    } finally {
      setCreatingBooking(false);
    }
  };

  /**
   * Định dạng ngày giờ theo định dạng Việt Nam
   * @param dateString - Chuỗi ngày giờ
   * @returns Ngày giờ đã định dạng
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "short",
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
    if (statusLower.includes("confirmed") || statusLower.includes("đã xác nhận")) {
      return "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300";
    }
    if (statusLower.includes("completed") || statusLower.includes("hoàn thành")) {
      return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300";
    }
    if (statusLower.includes("cancelled") || statusLower.includes("đã hủy")) {
      return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300";
    }
    if (statusLower.includes("pending") || statusLower.includes("đã đặt")) {
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
    }
    if (statusLower.includes("in-progress") || statusLower.includes("đang sử dụng")) {
      return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
    }
    return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
  };

  /**
   * Hủy booking
   * @param id - ID của booking cần hủy
   */
  const handleCancel = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn hủy booking này?")) {
      return;
    }
    try {
      await bookingService.cancelBooking(id);
      await loadBookings();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể hủy booking");
    }
  };

  /**
   * Mở modal cập nhật booking
   * @param booking - Booking cần cập nhật
   */
  const handleUpdate = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowUpdateModal(true);
  };

  /**
   * Mở modal check-in
   * @param booking - Booking cần check-in
   */
  const handleCheckIn = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCheckInModal(true);
  };

  /**
   * Mở modal check-out
   * @param booking - Booking cần check-out
   */
  const handleCheckOut = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCheckOutModal(true);
  };

  /**
   * Kiểm tra xem có thể check-in không
   * @param booking - Booking cần kiểm tra
   * @returns true nếu có thể check-in
   */
  const canCheckIn = (booking: Booking) => {
    const status = booking.status.toLowerCase();
    return (
      (status.includes("confirmed") || status.includes("đã xác nhận")) &&
      !booking.checkInTime
    );
  };

  /**
   * Kiểm tra xem có thể check-out không
   * @param booking - Booking cần kiểm tra
   * @returns true nếu có thể check-out
   */
  const canCheckOut = (booking: Booking) => {
    // Đã check-out rồi thì không thể check-out nữa
    if (booking.checkOutTime) {
      return false;
    }
    
    // Phải đã check-in hoặc status là completed (có thể check-out sau khi complete)
    const hasCheckIn = !!booking.checkInTime;
    const status = booking.status?.toLowerCase() || "";
    const isCompleted = status.includes("completed") || status.includes("hoàn thành");
    
    // Có thể check-out nếu:
    // 1. Đã check-in và chưa check-out, hoặc
    // 2. Status là completed nhưng chưa check-out (cho phép check-out sau khi complete)
    if (hasCheckIn || isCompleted) {
      const allowedStatuses = ["confirmed", "in-progress", "inprogress", "checked-in", "checkedin", "completed", "hoàn thành"];
      return allowedStatuses.some(s => status.includes(s));
    }
    
    return false;
  };

  /**
   * Kiểm tra xem có thể cập nhật booking không
   * @param booking - Booking cần kiểm tra
   * @returns true nếu có thể cập nhật
   */
  const canUpdate = (booking: Booking) => {
    const status = booking.status.toLowerCase();
    return (
      status.includes("pending") ||
      status.includes("đã đặt") ||
      status.includes("confirmed") ||
      status.includes("đã xác nhận")
    );
  };

  /**
   * Kiểm tra xem có thể hủy booking không
   * @param booking - Booking cần kiểm tra
   * @returns true nếu có thể hủy
   */
  const canCancel = (booking: Booking) => {
    const status = booking.status.toLowerCase();
    return (
      !status.includes("completed") &&
      !status.includes("hoàn thành") &&
      !status.includes("cancelled") &&
      !status.includes("đã hủy")
    );
  };

  return (
    <>
      <PageMeta title="Đồng sở hữu | Đặt Xe Của Tôi" />
      <PageHeader
        title="Đặt Xe Của Tôi"
        description="Quản lý các chuyến đi sắp tới, xem lịch sử, và chia sẻ quyền truy cập với các đồng sở hữu khác."
        actions={
          <Button 
            size="sm" 
            type="button"
            onClick={() => setShowCreateModal(true)}
          >
            Đặt Xe Mới
          </Button>
        }
      />
      
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải danh sách bookings...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">Không tìm thấy booking nào.</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Booking #{booking.id}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      {formatDate(booking.startTime)} - {formatDate(booking.endTime)}
                    </p>
                    {booking.vehicleName && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Xe: {booking.vehicleName}
                      </p>
                    )}
                    {booking.distanceKm && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Quãng đường: {booking.distanceKm} km
                      </p>
                    )}
                    {booking.cost && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Chi phí: ₫{booking.cost.toLocaleString()}
                      </p>
                    )}
                    {booking.checkInTime && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Check-in: {formatDate(booking.checkInTime)}
                      </p>
                    )}
                    {booking.checkOutTime && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Check-out: {formatDate(booking.checkOutTime)}
                      </p>
                    )}
                    {booking.note && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Ghi chú: {booking.note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col">
                    {canCheckIn(booking) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckIn(booking)}
                      >
                        Check In
                      </Button>
                    )}
                    {canCheckOut(booking) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckOut(booking)}
                      >
                        Check Out
                      </Button>
                    )}
                    {canUpdate(booking) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdate(booking)}
                      >
                        Sửa
                      </Button>
                    )}
                    {canCancel(booking) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(booking.id)}
                      >
                        Hủy
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Booking Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedVehicleId("");
          setStartTime("");
          setEndTime("");
          setNote("");
          setAiSuggestion(null);
          setBookingError(null);
        }}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Đặt Xe Mới
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Chọn xe và thời gian, AI sẽ kiểm tra và phê duyệt đặt xe của bạn
            </p>
          </div>

          <div className="px-2 space-y-4">
            {loadingVehicles ? (
              <p className="text-gray-600 dark:text-gray-400">Đang tải danh sách xe...</p>
            ) : availableVehicles.length === 0 ? (
              <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 dark:border-warning-500/40 dark:bg-warning-500/10">
                <p className="text-sm text-warning-600 dark:text-warning-200">
                  Bạn chưa có quyền sở hữu xe nào. Vui lòng liên hệ admin để được thêm vào nhóm sở hữu.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Label>Chọn Xe <span className="text-error-500">*</span></Label>
                  <Select
                    value={selectedVehicleId}
                    onChange={(value) => {
                      setSelectedVehicleId(value);
                      setAiSuggestion(null);
                    }}
                  >
                    <option value="">Chọn xe</option>
                    {availableVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleName}
                        {vehicle.currentUserOwnership && (
                          ` (Sở hữu: ${vehicle.currentUserOwnership.ownershipPercentage}%)`
                        )}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Thời gian bắt đầu <span className="text-error-500">*</span></Label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setAiSuggestion(null);
                    }}
                    min={getCurrentDateTime()}
                    required
                  />
                </div>

                <div>
                  <Label>Thời gian kết thúc <span className="text-error-500">*</span></Label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setAiSuggestion(null);
                    }}
                    min={startTime || getCurrentDateTime()}
                    required
                  />
                </div>

                <div>
                  <Label>Ghi chú (Tùy chọn)</Label>
                  <textarea
                    className="h-24 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden focus:ring-2 focus:ring-brand-300/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Thêm ghi chú..."
                  />
                </div>

                {selectedVehicleId && startTime && endTime && (
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleGetAISuggestion}
                      disabled={loadingAI}
                      className="w-full"
                    >
                      {loadingAI ? "Đang kiểm tra AI..." : "Kiểm tra AI Fairness"}
                    </Button>
                  </div>
                )}

                {aiSuggestion && (
                  <div className={`rounded-lg border p-4 ${
                    (() => {
                      const durationHours = startTime && endTime ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60) : 1.0;
                      const threshold = durationHours < 1.0 ? 0.3 : 0.5;
                      return aiSuggestion.fairness_score >= threshold;
                    })()
                      ? "border-green-200 bg-green-50 dark:border-green-500/40 dark:bg-green-500/10"
                      : "border-red-200 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${
                          (() => {
                      const durationHours = startTime && endTime ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60) : 1.0;
                      const threshold = durationHours < 1.0 ? 0.3 : 0.5;
                      return aiSuggestion.fairness_score >= threshold;
                    })()
                            ? "text-green-900 dark:text-green-200"
                            : "text-red-900 dark:text-red-200"
                        }`}>
                          Kết quả kiểm tra AI
                        </h4>
                        <p className={`mt-1 text-xs ${
                          (() => {
                      const durationHours = startTime && endTime ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60) : 1.0;
                      const threshold = durationHours < 1.0 ? 0.3 : 0.5;
                      return aiSuggestion.fairness_score >= threshold;
                    })()
                            ? "text-green-700 dark:text-green-300"
                            : "text-red-700 dark:text-red-300"
                        }`}>
                          {aiSuggestion.reason}
                        </p>
                        <p className={`mt-2 text-xs font-medium ${
                          (() => {
                      const durationHours = startTime && endTime ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60) : 1.0;
                      const threshold = durationHours < 1.0 ? 0.3 : 0.5;
                      return aiSuggestion.fairness_score >= threshold;
                    })()
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          Điểm công bằng: {(aiSuggestion.fairness_score * 100).toFixed(1)}%
                        </p>
                        {(() => {
                          const durationHours = startTime && endTime ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60) : 1.0;
                          const threshold = durationHours < 1.0 ? 0.3 : 0.5;
                          return aiSuggestion.fairness_score >= threshold && aiSuggestion.fairness_score < 0.7;
                        })() && (
                          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                            ⚠️ Điểm công bằng ở mức trung bình. Nếu có thể, hãy cân nhắc thời gian khác.
                          </p>
                        )}
                        {(() => {
                          const durationHours = startTime && endTime ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60) : 1.0;
                          const threshold = durationHours < 1.0 ? 0.3 : 0.5;
                          return aiSuggestion.fairness_score < threshold && durationHours >= 0.25;
                        })() && (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                            ❌ Đặt xe này không được phép vì không công bằng với các đồng sở hữu khác.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiSuggestion(null)}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {bookingError && (
                  <div className="rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-500/40 dark:bg-error-500/10">
                    <p className="text-sm text-error-600 dark:text-error-200">{bookingError}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 lg:justify-end mt-6">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedVehicleId("");
                      setStartTime("");
                      setEndTime("");
                      setNote("");
                      setAiSuggestion(null);
                      setBookingError(null);
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleCreateBooking}
                    disabled={!selectedVehicleId || !startTime || !endTime || !aiSuggestion || creatingBooking || loadingAI || (aiSuggestion && (() => {
                      const durationHours = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
                      const threshold = durationHours < 1.0 ? 0.3 : 0.5;
                      return aiSuggestion.fairness_score < threshold && durationHours >= 0.25;
                    })())}
                  >
                    {creatingBooking ? "Đang đặt..." : "Đặt Xe"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      {selectedBooking && (
        <UpdateBookingModal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedBooking(null);
          }}
          onSuccess={loadBookings}
          booking={selectedBooking}
        />
      )}

      {selectedBooking && (
        <>
          <CheckInModal
            isOpen={showCheckInModal}
            onClose={() => {
              setShowCheckInModal(false);
              setSelectedBooking(null);
            }}
            onSuccess={loadBookings}
            booking={selectedBooking}
          />

          <CheckOutModal
            isOpen={showCheckOutModal}
            onClose={() => {
              setShowCheckOutModal(false);
              setSelectedBooking(null);
            }}
            onSuccess={loadBookings}
            booking={selectedBooking}
          />
        </>
      )}
    </>
  );
};

export default MyBookings;
