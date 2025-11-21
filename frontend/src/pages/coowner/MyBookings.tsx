import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService, Booking } from "../../services/bookingService";
import CreateBookingModal from "../../components/modals/CreateBookingModal";
import UpdateBookingModal from "../../components/modals/UpdateBookingModal";
import CheckInModal from "../../components/modals/CheckInModal";
import CheckOutModal from "../../components/modals/CheckOutModal";
import BookingNeedModal, { BookingNeedType } from "../../components/modals/BookingNeedModal";
import VehicleSelection from "./VehicleSelection";

const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showNeedModal, setShowNeedModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedNeedType, setSelectedNeedType] = useState<BookingNeedType | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [showVehicleSelection, setShowVehicleSelection] = useState(false);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const data = await bookingService.getBookings(userId || undefined);
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    // Show need selection modal on first visit
    const hasSeenModal = sessionStorage.getItem("booking-need-selected");
    if (!hasSeenModal && bookings.length === 0) {
      setShowNeedModal(true);
    }
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }
    try {
      await bookingService.cancelBooking(id);
      await loadBookings();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel booking");
    }
  };

  const handleUpdate = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowUpdateModal(true);
  };

  const handleCheckIn = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCheckInModal(true);
  };

  const handleCheckOut = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCheckOutModal(true);
  };

  const canCheckIn = (booking: Booking) => {
    const status = booking.status.toLowerCase();
    return (
      (status.includes("confirmed") || status.includes("đã xác nhận")) &&
      !booking.checkInTime
    );
  };

  const canCheckOut = (booking: Booking) => {
    return !!booking.checkInTime && !booking.checkOutTime;
  };

  const canUpdate = (booking: Booking) => {
    const status = booking.status.toLowerCase();
    return (
      status.includes("pending") ||
      status.includes("đã đặt") ||
      status.includes("confirmed") ||
      status.includes("đã xác nhận")
    );
  };

  const canCancel = (booking: Booking) => {
    const status = booking.status.toLowerCase();
    return (
      !status.includes("completed") &&
      !status.includes("hoàn thành") &&
      !status.includes("cancelled") &&
      !status.includes("đã hủy")
    );
  };

  // Show vehicle selection if need type is selected
  if (showVehicleSelection && selectedNeedType) {
    return (
      <VehicleSelection
        needType={selectedNeedType}
        duration={selectedDuration}
        onBack={() => {
          setShowVehicleSelection(false);
          setSelectedNeedType(null);
          setSelectedDuration(0);
        }}
      />
    );
  }

  return (
    <>
      <PageMeta title="Co-owner | My Bookings" />
      <PageHeader
        title="My Bookings"
        description="Manage upcoming trips, review history, and share access with fellow co-owners."
        actions={
          <Button 
            size="sm" 
            type="button"
            onClick={() => setShowNeedModal(true)}
          >
            Đặt Xe Mới
          </Button>
        }
      />
      
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading bookings...</p>
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
              <p className="text-gray-600 dark:text-gray-400">No bookings found.</p>
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
                        Vehicle: {booking.vehicleName}
                      </p>
                    )}
                    {booking.distanceKm && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Distance: {booking.distanceKm} km
                      </p>
                    )}
                    {booking.cost && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Cost: ₫{booking.cost.toLocaleString()}
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
                        Note: {booking.note}
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
                        Edit
                      </Button>
                    )}
                    {canCancel(booking) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(booking.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <BookingNeedModal
        isOpen={showNeedModal}
        onClose={() => setShowNeedModal(false)}
        onSelect={(needType, duration) => {
          setSelectedNeedType(needType);
          setSelectedDuration(duration);
          setShowNeedModal(false);
          setShowVehicleSelection(true);
          sessionStorage.setItem("booking-need-selected", "true");
        }}
      />

      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadBookings}
      />

      {selectedBooking && (
        <>
          <UpdateBookingModal
            isOpen={showUpdateModal}
            onClose={() => {
              setShowUpdateModal(false);
              setSelectedBooking(null);
            }}
            onSuccess={loadBookings}
            booking={selectedBooking}
          />

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
