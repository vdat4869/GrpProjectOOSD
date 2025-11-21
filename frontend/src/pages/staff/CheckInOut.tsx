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

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingService.getBookings();
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "all") return true;
    const status = booking.status.toLowerCase();
    if (filter === "pending") return status === "pending" || status === "confirmed";
    if (filter === "confirmed") return status === "confirmed";
    if (filter === "in-progress") return status === "in-progress" || status === "checked-in";
    if (filter === "completed") return status === "completed" || status === "checked-out";
    return true;
  });

  const canCheckIn = (booking: Booking) => {
    const status = booking.status.toLowerCase();
    return (status === "confirmed" || status === "pending") && !booking.checkInTime;
  };

  const canCheckOut = (booking: Booking) => {
    const status = booking.status.toLowerCase();
    return (status === "in-progress" || status === "checked-in") && booking.checkInTime && !booking.checkOutTime;
  };

  const handleCheckIn = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCheckInModal(true);
  };

  const handleCheckOut = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCheckOutModal(true);
  };

  const handleSuccess = () => {
    loadBookings();
    setShowCheckInModal(false);
    setShowCheckOutModal(false);
    setSelectedBooking(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
      <PageMeta title="Staff | Check-In / Check-Out" />
      <PageHeader
        title="Check-In / Check-Out"
        description="Validate booking QR codes, confirm vehicle condition, and capture digital signatures on-site."
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "primary" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={filter === "pending" ? "primary" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Pending Check-in
        </Button>
        <Button
          size="sm"
          variant={filter === "confirmed" ? "primary" : "outline"}
          onClick={() => setFilter("confirmed")}
        >
          Confirmed
        </Button>
        <Button
          size="sm"
          variant={filter === "in-progress" ? "primary" : "outline"}
          onClick={() => setFilter("in-progress")}
        >
          In Progress
        </Button>
        <Button
          size="sm"
          variant={filter === "completed" ? "primary" : "outline"}
          onClick={() => setFilter("completed")}
        >
          Completed
        </Button>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Loading bookings...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-200">{error}</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">No bookings found</p>
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
                      Booking #{booking.id}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                    <div>
                      <span className="font-medium">Vehicle:</span> {booking.vehicleName || `Vehicle #${booking.vehicleId}`}
                    </div>
                    <div>
                      <span className="font-medium">Co-owner:</span> {booking.coOwnerName || `Co-owner #${booking.coOwnerId}`}
                    </div>
                    <div>
                      <span className="font-medium">Start:</span> {formatDate(booking.startTime)}
                    </div>
                    <div>
                      <span className="font-medium">End:</span> {formatDate(booking.endTime)}
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
                        <span className="font-medium">Distance:</span> {booking.distanceKm} km
                      </div>
                    )}
                    {booking.cost && (
                      <div>
                        <span className="font-medium">Cost:</span> ₫{booking.cost.toLocaleString()}
                      </div>
                    )}
                  </div>
                  {booking.note && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Note:</span> {booking.note}
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
