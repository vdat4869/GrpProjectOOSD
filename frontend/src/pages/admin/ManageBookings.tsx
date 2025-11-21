import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService, Booking } from "../../services/bookingService";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";

const ManageBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<VehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "conflicts" | "pending">("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bookingsData, vehiclesData] = await Promise.all([
        bookingService.getBookings(),
        ownershipService.getGroups(),
      ]);
      setBookings(bookingsData);
      setVehicles(vehiclesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const getVehicleName = (vehicleId: string | number) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId.toString());
    return vehicle?.vehicleName || vehicleId.toString().substring(0, 8);
  };

  const detectConflicts = (): Booking[] => {
    const conflicts: Booking[] = [];
    const activeBookings = bookings.filter(
      (b) => b.status.toLowerCase() === "confirmed" || b.status.toLowerCase() === "in-progress"
    );

    for (let i = 0; i < activeBookings.length; i++) {
      for (let j = i + 1; j < activeBookings.length; j++) {
        const b1 = activeBookings[i];
        const b2 = activeBookings[j];
        if (b1.vehicleId === b2.vehicleId) {
          const start1 = new Date(b1.startTime);
          const end1 = new Date(b1.endTime);
          const start2 = new Date(b2.startTime);
          const end2 = new Date(b2.endTime);

          if (start1 <= end2 && start2 <= end1) {
            if (!conflicts.find((c) => c.id === b1.id)) conflicts.push(b1);
            if (!conflicts.find((c) => c.id === b2.id)) conflicts.push(b2);
          }
        }
      }
    }
    return conflicts;
  };

  const filteredBookings = () => {
    switch (filter) {
      case "active":
        return bookings.filter(
          (b) =>
            b.status.toLowerCase() === "confirmed" || b.status.toLowerCase() === "in-progress"
        );
      case "conflicts":
        return detectConflicts();
      case "pending":
        return bookings.filter((b) => b.status.toLowerCase() === "pending");
      default:
        return bookings;
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "confirmed" || s === "in-progress")
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300";
    if (s === "pending")
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
    if (s === "cancelled")
      return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
    return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
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

  const handleIntervene = async (bookingId: number) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await bookingService.cancelBooking(bookingId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
    }
  };

  return (
    <>
      <PageMeta title="Admin | Manage Bookings" />
      <PageHeader
        title="Booking Management"
        description="Monitor booking history, detect conflicts, and intervene in special cases."
        actions={<Button size="sm" onClick={loadData} disabled={loading}>Refresh</Button>}
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "primary" : "outline"}
          onClick={() => setFilter("all")}
        >
          All ({bookings.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "active" ? "primary" : "outline"}
          onClick={() => setFilter("active")}
        >
          Active ({bookings.filter((b) => b.status.toLowerCase() === "confirmed" || b.status.toLowerCase() === "in-progress").length})
        </Button>
        <Button
          size="sm"
          variant={filter === "conflicts" ? "primary" : "outline"}
          onClick={() => setFilter("conflicts")}
        >
          Conflicts ({detectConflicts().length})
        </Button>
        <Button
          size="sm"
          variant={filter === "pending" ? "primary" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Pending ({bookings.filter((b) => b.status.toLowerCase() === "pending").length})
        </Button>
      </div>

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
          {filteredBookings().length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">No bookings found.</p>
            </div>
          ) : (
            filteredBookings().map((booking) => {
              const isConflict = detectConflicts().some((c) => c.id === booking.id);
              return (
                <div
                  key={booking.id}
                  className={`overflow-hidden rounded-2xl border shadow-theme-xs ${
                    isConflict
                      ? "border-error-200 bg-error-50 dark:border-error-500/40 dark:bg-error-500/10"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                  }`}
                >
                  <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                            Booking #{booking.id}
                          </h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                          {isConflict && (
                            <span className="rounded-full bg-error-500 px-3 py-1 text-xs font-semibold text-white">
                              CONFLICT
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Vehicle: {getVehicleName(booking.vehicleId.toString())} • CoOwner: {booking.coOwnerId || "Unknown"}
                        </p>
                      </div>
                      {isConflict && (
                        <Button size="sm" variant="outline" onClick={() => handleIntervene(booking.id)}>
                          Intervene
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Time Schedule
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p>Start: {formatDate(booking.startTime)}</p>
                          <p>End: {formatDate(booking.endTime)}</p>
                          {booking.checkInTime && <p>Check-in: {formatDate(booking.checkInTime)}</p>}
                          {booking.checkOutTime && <p>Check-out: {formatDate(booking.checkOutTime)}</p>}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Details
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p>Created: {formatDate(booking.createdAt || booking.startTime)}</p>
                          {booking.note && <p>Note: {booking.note}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
};

export default ManageBookings;

