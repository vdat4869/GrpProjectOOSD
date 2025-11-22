import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService, Booking } from "../../services/bookingService";

const MonitorBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "completed">("all");

  useEffect(() => {
    loadBookings();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadBookings, 30000);
    return () => clearInterval(interval);
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
    const statusLower = booking.status.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);

    if (filter === "active") {
      // Active: InProgress, Confirmed (đang trong khoảng thời gian), Approved
      const isActiveStatus = ["inprogress", "confirmed", "approved", "đãđặt"].some(s => statusLower.includes(s));
      return isActiveStatus && startTime <= now && endTime >= now;
    }
    if (filter === "upcoming") {
      // Upcoming: Pending, Confirmed, Approved (chưa bắt đầu)
      const isUpcomingStatus = ["pending", "confirmed", "approved"].some(s => statusLower.includes(s));
      return isUpcomingStatus && startTime > now;
    }
    if (filter === "completed") {
      // Completed: Completed, Checked-out
      return statusLower.includes("completed") || statusLower.includes("checkedout");
    }
    return true;
  });

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

  const getTimeStatus = (booking: Booking) => {
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);

    if (now < startTime) {
      const diff = startTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `Starts in ${hours}h ${minutes}m`;
    }
    if (now >= startTime && now <= endTime) {
      return "In progress";
    }
    if (now > endTime) {
      return "Ended";
    }
    return "";
  };

  return (
    <>
      <PageMeta title="Staff | Monitor Bookings" />
      <PageHeader
        title="Monitor Bookings"
        description="Keep an eye on active journeys, respond to alerts, and coordinate with co-owners in real time."
        actions={
          <Button size="sm" onClick={loadBookings} disabled={loading}>
            Refresh
          </Button>
        }
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
          variant={filter === "active" ? "primary" : "outline"}
          onClick={() => setFilter("active")}
        >
          Active
        </Button>
        <Button
          size="sm"
          variant={filter === "upcoming" ? "primary" : "outline"}
          onClick={() => setFilter("upcoming")}
        >
          Upcoming
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
      {loading && !bookings.length ? (
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
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      Booking #{booking.id}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getTimeStatus(booking)}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default MonitorBookings;
