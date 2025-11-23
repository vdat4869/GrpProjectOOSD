import { useState, useEffect, FormEvent } from "react";
import { bookingService, UpdateBookingRequest, Booking } from "../../services/bookingService";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

// Props cho modal cập nhật booking
interface UpdateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  booking: Booking;
}

// Modal để cập nhật thông tin booking
export default function UpdateBookingModal({
  isOpen,
  onClose,
  onSuccess,
  booking,
}: UpdateBookingModalProps) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && booking) {
      // Chuyển đổi chuỗi ISO sang định dạng datetime-local
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      
      const formatForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setStartTime(formatForInput(start));
      setEndTime(formatForInput(end));
      setNote(booking.note || "");
    }
  }, [isOpen, booking]);

  // Xử lý submit form cập nhật booking
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!startTime || !endTime) {
        throw new Error("Vui lòng chọn thời gian bắt đầu và kết thúc");
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (end <= start) {
        throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
      }

      const data: UpdateBookingRequest = {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        note: note || undefined,
      };

      await bookingService.updateBooking(booking.id, data);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật booking");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý click vào backdrop để đóng modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            Cập Nhật Booking #{booking.id}
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
            <Label>Thời Gian Bắt Đầu *</Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Thời Gian Kết Thúc *</Label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={startTime}
              required
            />
          </div>

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
            <Button type="submit" size="sm" className="flex-1" disabled={loading}>
              {loading ? "Đang cập nhật..." : "Cập Nhật Booking"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

