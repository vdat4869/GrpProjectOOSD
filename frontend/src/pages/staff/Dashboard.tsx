/**
 * Dashboard Staff - Trung tâm điều khiển vận hành
 * Theo dõi các nhiệm vụ hàng ngày, thông lượng đặt chỗ và tồn đọng bảo dưỡng
 */
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

  // Load thống kê và tự động làm mới mỗi 60 giây
  useEffect(() => {
    loadStats();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Tải thống kê từ các API
   */
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
        console.error("Không thể tải hồ sơ bảo dưỡng:", err);
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
      console.error("Không thể tải thống kê:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Staff | Bảng Điều Khiển" />
      <PageHeader
        title="Trung Tâm Điều Khiển Vận Hành"
        description="Theo dõi các nhiệm vụ hàng ngày, thông lượng đặt chỗ và tồn đọng bảo dưỡng cho đội xe điện."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Check-in Đã Lên Lịch"
          value={loading ? "..." : stats.scheduledCheckIns}
          trend={loading ? "" : stats.scheduledCheckIns > 0 ? `▲ ${stats.scheduledCheckIns}` : "Không có sắp tới"}
        />
        <StatCard
          label="Xe Đang Phục Vụ"
          value={loading ? "..." : stats.vehiclesInService}
          trend={loading ? "" : stats.vehiclesInService > 0 ? `▲ ${stats.vehiclesInService}` : "Không có"}
        />
        <StatCard
          label="Bảo Dưỡng Mở"
          value={loading ? "..." : stats.openMaintenance}
          trend={loading ? "" : stats.openMaintenance > 0 ? `▲ ${stats.openMaintenance}` : "Không có"}
        />
        <StatCard
          label="Tranh Chấp Chờ Xử Lý"
          value={loading ? "..." : stats.pendingDisputes}
          trend={loading ? "" : stats.pendingDisputes > 0 ? `▲ ${stats.pendingDisputes}` : "Không có"}
        />
      </div>
    </>
  );
};

export default StaffDashboard;
