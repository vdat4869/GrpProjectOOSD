import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import { bookingService } from "../../services/bookingService";
import { reportService } from "../../services/reportService";

const StaffDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    scheduledCheckIns: 0,
    vehiclesInService: 0,
    openMaintenance: 0,
    pendingDisputes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Load bookings
      const bookings = await bookingService.getBookings();
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Scheduled check-ins (confirmed bookings starting in next 24 hours)
      const scheduledCheckIns = bookings.filter((booking) => {
        const status = booking.status.toLowerCase();
        const startTime = new Date(booking.startTime);
        return (status === "confirmed" || status === "pending") && 
               startTime >= now && 
               startTime <= next24Hours &&
               !booking.checkInTime;
      }).length;

      // Vehicles in service (active bookings)
      const vehiclesInService = bookings.filter((booking) => {
        const status = booking.status.toLowerCase();
        const startTime = new Date(booking.startTime);
        const endTime = new Date(booking.endTime);
        return (status === "in-progress" || status === "checked-in") && 
               startTime <= now && 
               endTime >= now;
      }).length;

      // Load maintenance records
      // Note: We need to get all maintenance records, but API requires vehicleId
      // For now, we'll use a simplified approach - get from first vehicle group
      // In production, this should aggregate from all vehicles
      let openMaintenance = 0;
      try {
        // Try to get maintenance records from a default vehicle (simplified)
        // In real implementation, this should aggregate from all vehicles
        const maintenanceRecords = await reportService.getMaintenanceRecordsByDateRange(
          new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)  // Next 30 days
        );
        openMaintenance = maintenanceRecords.filter((record) => record.isActive).length;
      } catch (err) {
        console.error("Failed to load maintenance records:", err);
      }

      // Pending disputes - placeholder (no API available yet)
      const pendingDisputes = 0;

      setStats({
        scheduledCheckIns,
        vehiclesInService,
        openMaintenance,
        pendingDisputes,
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Staff | Dashboard" />
      <PageHeader
        title="Operations Control Center"
        description="Track daily assignments, booking throughput, and maintenance backlog for the EV fleet."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Scheduled Check-ins"
          value={loading ? "..." : stats.scheduledCheckIns}
          trend={loading ? "" : stats.scheduledCheckIns > 0 ? `▲ ${stats.scheduledCheckIns}` : "No upcoming"}
        />
        <StatCard
          label="Vehicles in Service"
          value={loading ? "..." : stats.vehiclesInService}
          trend={loading ? "" : stats.vehiclesInService > 0 ? `▲ ${stats.vehiclesInService}` : "None active"}
        />
        <StatCard
          label="Open Maintenance"
          value={loading ? "..." : stats.openMaintenance}
          trend={loading ? "" : stats.openMaintenance > 0 ? `▲ ${stats.openMaintenance}` : "All clear"}
        />
        <StatCard
          label="Pending Disputes"
          value={loading ? "..." : stats.pendingDisputes}
          trend={loading ? "" : stats.pendingDisputes > 0 ? `${stats.pendingDisputes} pending` : "None"}
        />
      </div>
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            Daily Task Allocation
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Visualize staff workload distribution for proactive shift planning.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/30">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Chart visualization will be implemented here
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Integration with analytics service pending
          </p>
        </div>
      </div>
    </>
  );
};

export default StaffDashboard;
