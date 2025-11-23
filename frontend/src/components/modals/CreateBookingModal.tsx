import { useState, useEffect, FormEvent } from "react";
import { bookingService, CreateBookingRequest, Vehicle } from "../../services/bookingService";
import { aiService, BookingSuggestionResponse } from "../../services/aiService";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

import { BookingNeedType } from "./BookingNeedModal";
import { generateOwnerCode } from "../../utils/ownerCode";
import OwnerCodeDisplay from "../common/OwnerCodeDisplay";

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicleId?: string | number;
  needType?: BookingNeedType;
  duration?: number;
}

export default function CreateBookingModal({
  isOpen,
  onClose,
  onSuccess,
  vehicleId: propVehicleId,
  needType,
  duration: _duration,
}: CreateBookingModalProps) {
  const [vehicleId, setVehicleId] = useState<number>(0);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<BookingSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<{ id: number; ownerCode: string; vehicleName?: string; vehicleModel?: string } | null>(null);

  // Load vehicles and groups when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          setLoadingVehicles(true);
          const [vehiclesData, groupsData] = await Promise.all([
            bookingService.getVehicles(),
            ownershipService.getGroups(),
          ]);
          setVehicles(vehiclesData);
          setGroups(groupsData);
          
          // If vehicleId prop is provided, set it
          if (propVehicleId) {
            const vehicleIdNum = typeof propVehicleId === 'string' ? parseInt(propVehicleId) : propVehicleId;
            if (!isNaN(vehicleIdNum)) {
              setVehicleId(vehicleIdNum);
            }
          }
        } catch (err) {
          console.error("Error loading data:", err);
          setError("Không thể tải danh sách xe");
        } finally {
          setLoadingVehicles(false);
        }
      };
      loadData();
    }
  }, [isOpen, propVehicleId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        throw new Error("Không tìm thấy người dùng. Vui lòng đăng nhập lại.");
      }

      if (vehicleId <= 0) {
        throw new Error("Vui lòng chọn nhóm xe");
      }

      if (!startTime || !endTime) {
        throw new Error("Vui lòng chọn thời gian bắt đầu và kết thúc");
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (end <= start) {
        throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
      }

      const coOwnerIdNum = userId ? parseInt(userId) : 1;

      const data: CreateBookingRequest = {
        vehicleId: vehicleId,
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
      
      // Generate owner code if needType and vehicle info available
      if (needType && booking) {
        // Try to find group by propVehicleId first
        let selectedGroup: VehicleGroup | undefined;
        if (propVehicleId) {
          const propId = typeof propVehicleId === 'string' ? propVehicleId : propVehicleId.toString();
          selectedGroup = groups.find((g) => g.id === propId || g.id.toString() === propId);
        }
        
        // If not found, try to find by vehicle name from booking
        if (!selectedGroup && booking.vehicleName) {
          selectedGroup = groups.find((g) => g.vehicleName === booking.vehicleName);
        }
        
        // If still not found, use first group as fallback
        if (!selectedGroup && groups.length > 0) {
          selectedGroup = groups[0];
        }
        
        if (selectedGroup) {
          const vehicleModel = selectedGroup.vehicleModel || selectedGroup.vehicleName || "UNK";
          const ownerCode = generateOwnerCode(needType, vehicleModel, new Date(), booking.id % 99 + 1);
          
          setCreatedBooking({
            id: booking.id,
            ownerCode,
            vehicleName: selectedGroup.vehicleName,
            vehicleModel: selectedGroup.vehicleModel,
          });
          
          // Don't close modal yet, show owner code
          return;
        }
      }
      
      onSuccess();
      onClose();
      // Đặt lại form
      setVehicleId(0);
      setStartTime("");
      setEndTime("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo booking");
    } finally {
      setLoading(false);
    }
  };

  // Lấy gợi ý từ AI
  const handleGetAISuggestion = async () => {
    if (!vehicleId || !startTime || !endTime) {
      setError("Vui lòng chọn xe và khoảng thời gian trước");
      return;
    }

    try {
      setLoadingSuggestion(true);
      setError(null);
      setAiSuggestion(null);

      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        throw new Error("User not found. Please login again.");
      }

      // Find vehicle group for this vehicle
      const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
      if (!selectedVehicle) {
        throw new Error("Không tìm thấy xe đã chọn");
      }

      // Thử tìm nhóm theo tên xe hoặc ID
      let group = groups.find((g) => g.vehicleName === selectedVehicle.name);
      if (!group && groups.length > 0) {
        // Nếu không có khớp chính xác, sử dụng nhóm đầu tiên (dự phòng)
        group = groups[0];
      }
      
      if (!group) {
        throw new Error("Không tìm thấy nhóm xe. Vui lòng đảm bảo bạn là thành viên của một nhóm xe.");
      }

      // Get ownership percentage for current user
      const ownerships = await ownershipService.getOwnerships(group.id);
      const userOwnership = ownerships.find((o) => o.coOwnerId === userId);
      const ownershipPercentage = userOwnership?.ownershipPercentage || 0;

      const suggestion = await aiService.getBookingSuggestion({
        vehicle_group_id: group.id,
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
      setError(err instanceof Error ? err.message : "Không thể lấy gợi ý từ AI");
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  // Get current datetime in local timezone for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            Tạo Booking Mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Đóng"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Xe *</Label>
            <select
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden focus:ring-2 focus:ring-brand-300/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              value={vehicleId}
              onChange={(e) => setVehicleId(parseInt(e.target.value))}
              required
              disabled={loadingVehicles}
            >
              <option value={0}>
                {loadingVehicles ? "Đang tải..." : "Chọn xe"}
              </option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Thời Gian Bắt Đầu *</Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={getCurrentDateTime()}
              required
            />
          </div>

          <div>
            <Label>Thời Gian Kết Thúc *</Label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={startTime || getCurrentDateTime()}
              required
            />
          </div>

          {vehicleId && startTime && endTime && (
            <div>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={handleGetAISuggestion}
                disabled={loadingSuggestion}
                className="w-full"
              >
                {loadingSuggestion ? "Đang lấy gợi ý AI..." : "Lấy Gợi ý Công Bằng từ AI"}
              </Button>
            </div>
          )}

          {aiSuggestion && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/40 dark:bg-blue-500/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    Gợi ý Công Bằng từ AI
                  </h4>
                  <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                    {aiSuggestion.reason}
                  </p>
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    Điểm Công Bằng: {(aiSuggestion.fairness_score * 100).toFixed(1)}%
                  </p>
                  {aiSuggestion.fairness_score < 0.7 && aiSuggestion.alternative_slots && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                        Khung Giờ Thay Thế:
                      </p>
                      {aiSuggestion.alternative_slots.slice(0, 2).map((slot, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setStartTime(new Date(slot.start).toISOString().slice(0, 16));
                            setEndTime(new Date(slot.end).toISOString().slice(0, 16));
                          }}
                          className="mt-1 block w-full rounded border border-blue-300 bg-white px-2 py-1 text-left text-xs text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-500/20"
                        >
                          {new Date(slot.start).toLocaleString()} - {new Date(slot.end).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAiSuggestion(null)}
                  className="text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div>
            <Label>Ghi Chú (Tùy chọn)</Label>
            <textarea
              className="h-24 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden focus:ring-2 focus:ring-brand-300/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thêm ghi chú bổ sung..."
            />
          </div>

          {error && (
            <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
              {error}
            </div>
          )}

          {createdBooking ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200">
                Tạo booking thành công!
              </div>
              <OwnerCodeDisplay
                ownerCode={createdBooking.ownerCode}
                vehicleName={createdBooking.vehicleName}
                vehicleModel={createdBooking.vehicleModel}
                status="Available"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setCreatedBooking(null);
                  onSuccess();
                  onClose();
                  // Đặt lại form
                  setVehicleId(0);
                  setStartTime("");
                  setEndTime("");
                  setNote("");
                }}
                className="w-full"
              >
                Hoàn Tất
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="flex-1"
                variant="outline"
              >
                Hủy
              </Button>
              <Button type="submit" size="sm" className="flex-1" disabled={loading || loadingVehicles}>
                {loading ? "Đang tạo..." : "Tạo Booking"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
