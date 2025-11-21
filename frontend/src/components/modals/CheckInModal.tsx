import { useState, useEffect, FormEvent } from "react";
import { bookingService, Booking } from "../../services/bookingService";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  booking: Booking;
}

export default function CheckInModal({
  isOpen,
  onClose,
  onSuccess,
  booking,
}: CheckInModalProps) {
  const [qrCode, setQrCode] = useState("");
  const [digitalSignature, setDigitalSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);

  // Check if booking is confirmed (can generate QR code)
  const isBookingConfirmed = () => {
    const status = booking.status.toLowerCase();
    return (
      status.includes("confirmed") ||
      status.includes("đã xác nhận") ||
      status.includes("đã đặt")
    );
  };

  useEffect(() => {
    if (isOpen && booking) {
      // Reset states when modal opens
      setQrCodeError(null);
      
      // If booking already has QR code, use it
      if (booking.qrCode) {
        setQrCode(booking.qrCode);
      } else if (isBookingConfirmed()) {
        // Only try to load QR code if booking is confirmed
        loadQrCode();
      } else {
        // Booking not confirmed yet
        setQrCodeError("Booking chưa được xác nhận. Vui lòng chờ xác nhận trước khi check-in.");
      }
    }
  }, [isOpen, booking]);

  const loadQrCode = async () => {
    // Don't load if booking is not confirmed
    if (!isBookingConfirmed()) {
      setQrCodeError("Booking chưa được xác nhận. Không thể tạo QR code.");
      return;
    }

    try {
      setLoadingQr(true);
      setQrCodeError(null);
      const qrResponse = await bookingService.getQrCode(booking.id);
      setQrCode(qrResponse.qrCode);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load QR code";
      setQrCodeError(errorMessage);
      // Don't log to console if it's expected (booking not confirmed)
      if (!errorMessage.includes("xác nhận") && !errorMessage.includes("confirmed")) {
        console.error("Failed to load QR code:", err);
      }
    } finally {
      setLoadingQr(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!qrCode && !digitalSignature) {
        throw new Error("Please provide QR code or digital signature");
      }

      await bookingService.checkIn(booking.id, {
        qrCode: qrCode || undefined,
        digitalSignature: digitalSignature || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check in");
    } finally {
      setLoading(false);
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
            Check In - Booking #{booking.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>QR Code</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder={
                  isBookingConfirmed()
                    ? "QR code will be loaded automatically"
                    : "Booking chưa được xác nhận"
                }
                disabled={loadingQr || !isBookingConfirmed()}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={loadQrCode}
                disabled={loadingQr || !isBookingConfirmed()}
              >
                {loadingQr ? "Loading..." : "Load QR"}
              </Button>
            </div>
            {qrCode && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                QR Code loaded successfully
              </p>
            )}
            {qrCodeError && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {qrCodeError}
              </p>
            )}
            {!isBookingConfirmed() && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Booking status: {booking.status}. Cần xác nhận trước khi check-in.
              </p>
            )}
          </div>

          <div>
            <Label>Digital Signature</Label>
            <Input
              type="text"
              value={digitalSignature}
              onChange={(e) => setDigitalSignature(e.target.value)}
              placeholder="Enter your digital signature"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Provide either QR code or digital signature
            </p>
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
              Cancel
            </Button>
            <Button type="submit" size="sm" className="flex-1" disabled={loading || loadingQr}>
              {loading ? "Checking In..." : "Check In"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

