import { useState, FormEvent } from "react";
import { bookingService, CheckOutRequest, Booking } from "../../services/bookingService";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

// Props cho modal Check-out
interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  booking: Booking;
}

// Modal để thực hiện check-out cho booking
export default function CheckOutModal({
  isOpen,
  onClose,
  onSuccess,
  booking,
}: CheckOutModalProps) {
  const [distanceKm, setDistanceKm] = useState("");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Xử lý submit form check-out
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Kiểm tra lại trạng thái booking trước khi submit
    if (booking.checkOutTime) {
      setError("Booking này đã được check-out rồi. Vui lòng làm mới trang để xem thông tin mới nhất.");
      return;
    }
    
    if (!booking.checkInTime) {
      setError("Booking này chưa được check-in. Vui lòng check-in trước.");
      return;
    }
    
    setLoading(true);

    try {
      if (!distanceKm || parseFloat(distanceKm) <= 0) {
        throw new Error("Vui lòng nhập khoảng cách hợp lệ");
      }

      const data: CheckOutRequest = {
        distanceKm: parseFloat(distanceKm),
        cost: cost ? parseFloat(cost) : undefined,
        note: note || undefined,
      };

      await bookingService.checkOut(booking.id, data);
      
      // Dispatch custom event để các component khác có thể refresh
      const checkoutEvent = new CustomEvent('bookingCompleted', {
        detail: {
          bookingId: booking.id,
          vehicleId: booking.vehicleId,
          distanceKm: parseFloat(distanceKm),
          cost: cost ? parseFloat(cost) : undefined,
        }
      });
      window.dispatchEvent(checkoutEvent);
      
      // Set session storage flag để refresh khi quay lại trang
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('checkoutJustCompleted', 'true');
      }
      
      onSuccess();
      onClose();
      // Đặt lại form
      setDistanceKm("");
      setCost("");
      setNote("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Không thể thực hiện check-out";
      setError(errorMessage);
      // Nếu booking đã được check-out, đóng modal
      if (errorMessage.includes("đã được check-out") || errorMessage.includes("already checked out")) {
        setTimeout(() => {
          onClose();
          onSuccess(); // Refresh data
        }, 2000);
      }
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

  // Kiểm tra booking đã check-out chưa khi modal mở
  if (booking.checkOutTime) {
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
              Check Out - Booking #{booking.id}
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
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            Booking này đã được check-out rồi. Vui lòng làm mới trang để xem thông tin mới nhất.
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    );
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
            Check Out - Booking #{booking.id}
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
            <Label>Khoảng Cách (km) *</Label>
            <Input
              type="number"
              step={0.1}
              min="0"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="Nhập khoảng cách đã đi"
              required
            />
          </div>

          <div>
            <Label>Chi Phí (VND) - Tùy chọn</Label>
            <Input
              type="number"
              step={1000}
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Nhập chi phí bổ sung"
            />
          </div>

          <div>
            <Label>Ghi Chú (Tùy chọn)</Label>
            <textarea
              className="h-24 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden focus:ring-2 focus:ring-brand-300/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thêm ghi chú về chuyến đi..."
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
              {loading ? "Đang check-out..." : "Check Out"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

