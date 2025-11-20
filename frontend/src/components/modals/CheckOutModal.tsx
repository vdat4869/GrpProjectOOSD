import { useState, FormEvent } from "react";
import { bookingService, CheckOutRequest, Booking } from "../../services/bookingService";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  booking: Booking;
}

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!distanceKm || parseFloat(distanceKm) <= 0) {
        throw new Error("Please enter a valid distance");
      }

      const data: CheckOutRequest = {
        distanceKm: parseFloat(distanceKm),
        cost: cost ? parseFloat(cost) : undefined,
        note: note || undefined,
      };

      await bookingService.checkOut(booking.id, data);
      onSuccess();
      onClose();
      // Reset form
      setDistanceKm("");
      setCost("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check out");
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
            Check Out - Booking #{booking.id}
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
            <Label>Distance (km) *</Label>
            <Input
              type="number"
              step={0.1}
              min="0"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="Enter distance traveled"
              required
            />
          </div>

          <div>
            <Label>Cost (VND) - Optional</Label>
            <Input
              type="number"
              step={1000}
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Enter additional costs"
            />
          </div>

          <div>
            <Label>Note (Optional)</Label>
            <textarea
              className="h-24 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden focus:ring-2 focus:ring-brand-300/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any notes about the trip..."
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
              Cancel
            </Button>
            <Button type="submit" size="sm" className="flex-1" disabled={loading}>
              {loading ? "Checking Out..." : "Check Out"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

