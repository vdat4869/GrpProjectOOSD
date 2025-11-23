/**
 * Dashboard Admin - Tổng quan hệ thống
 * Hiển thị thống kê về nhóm, hợp đồng, tranh chấp và doanh thu
 */
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import LineChartOne from "../../components/charts/line/LineChartOne";
import { ownershipService } from "../../services/ownershipService";

const AdminDashboard: React.FC = () => {
  const [activeGroups, setActiveGroups] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load thống kê khi component mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const groups = await ownershipService.getGroups();
        const active = groups.filter((g) => g.status === 1).length;
        setActiveGroups(active);
      } catch (err) {
        console.error("Không thể tải thống kê:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <>
      <PageMeta title="Admin | Bảng Điều Khiển" />
      <PageHeader
        title="Tổng Quan Quản Trị"
        description="Giám sát hiệu suất nhóm, tình trạng hệ thống và tín hiệu quản trị trên toàn mạng lưới đồng sở hữu xe điện."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Nhóm Hoạt Động"
          value={loading ? "..." : activeGroups.toString()}
          trend=""
        />
        <StatCard label="Hợp Đồng Chờ Xử Lý" value="12" trend="▼ 1.1%" />
        <StatCard label="Tranh Chấp Mở" value="3" trend="Ổn Định" />
        <StatCard label="Doanh Thu Tháng" value="₫128M" trend="▲ 12.4%" />
      </div>
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            Tăng Trưởng Nền Tảng
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Xu hướng đặt chỗ và doanh thu kết hợp trên tất cả các nhóm đồng sở hữu.
          </p>
        </div>
        <LineChartOne />
      </div>
    </>
  );
};

export default AdminDashboard;
