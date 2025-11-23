import { useEffect, useState, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Chart from "react-apexcharts";
import Button from "../../components/ui/button/Button";
import Select from "../../components/form/Select";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import {
  reportService,
  UsageStatistics,
  CostStatistics,
} from "../../services/reportService";
import { ownershipService, VehicleGroup, Ownership } from "../../services/ownershipService";
import { bookingService, Booking } from "../../services/bookingService";
import { aiService, FairnessCheckResponse } from "../../services/aiService";

/**
 * Trang phân tích sử dụng - so sánh thói quen lái xe với mức trung bình của nhóm
 */
const UsageAnalytics: React.FC = () => {
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 ngày trước
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [usageStats, setUsageStats] = useState<UsageStatistics | null>(null);
  const [costStats, setCostStats] = useState<CostStatistics | null>(null);
  const [fairnessCheck, setFairnessCheck] = useState<FairnessCheckResponse | null>(null);
  const [ownerships, setOwnerships] = useState<Ownership[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [_loadingFairness, setLoadingFairness] = useState(false);
  const [_selectedGroup, _setSelectedGroup] = useState<VehicleGroup | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    if (!selectedVehicleId) {
      console.log('[UsageAnalytics] loadStatistics: No selectedVehicleId, skipping');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[UsageAnalytics] Loading statistics for vehicleId:', selectedVehicleId, 'date range:', startDate, 'to', endDate);
      const [usage, cost] = await Promise.all([
        reportService.getUsageStatistics(selectedVehicleId, startDate, endDate),
        reportService.getCostStatistics(selectedVehicleId, startDate, endDate),
      ]);
      console.log('[UsageAnalytics] Received usage stats:', usage);
      console.log('[UsageAnalytics] Received cost stats:', cost);
      setUsageStats(usage);
      setCostStats(cost);
    } catch (err) {
      console.error('[UsageAnalytics] Error loading statistics:', err);
      setError(err instanceof Error ? err.message : "Không thể tải thống kê");
    } finally {
      setLoading(false);
    }
  }, [selectedVehicleId, startDate, endDate]);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      loadStatistics();
      loadFairnessCheck();
    }
    if (selectedGroupId) {
      loadOwnerships();
      loadBookings();
    }
  }, [selectedVehicleId, selectedGroupId, startDate, endDate, loadStatistics]);

  /**
   * Listen for booking completed events to refresh usage analytics
   */
  useEffect(() => {
    const handleBookingCompleted = async () => {
      console.log('[UsageAnalytics] Booking completed event received, refreshing statistics...');
      if (selectedVehicleId) {
        // Delay để đảm bảo backend đã xử lý xong
        setTimeout(() => {
          loadStatistics();
        }, 2000);
        // Retry sau 5 giây
        setTimeout(() => {
          console.log('[UsageAnalytics] Second retry after checkout...');
          loadStatistics();
        }, 5000);
      }
    };

    window.addEventListener('bookingCompleted', handleBookingCompleted);

    // Listen for window focus to refresh if checkout just completed
    const handleFocus = () => {
      if (typeof window !== 'undefined') {
        const checkoutJustCompleted = sessionStorage.getItem('checkoutJustCompleted');
        if (checkoutJustCompleted === 'true' && selectedVehicleId) {
          console.log('[UsageAnalytics] Window focused, checkout just completed, refreshing...');
          sessionStorage.removeItem('checkoutJustCompleted');
          setTimeout(() => {
            loadStatistics();
          }, 1500);
        }
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('bookingCompleted', handleBookingCompleted);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedVehicleId, loadStatistics]);

  const loadGroups = async () => {
    try {
      // Lấy co-owner hiện tại
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        console.error("Không tìm thấy user. Vui lòng đăng nhập lại.");
        return;
      }
      
      const coOwner = await ownershipService.getCoOwnerByUserId(userId);
      if (!coOwner) {
        console.error("Tài khoản chưa được đăng ký làm co-owner.");
        return;
      }
      
      // Lấy tất cả quyền sở hữu của co-owner (chỉ active)
      const allOwnerships = await ownershipService.getOwnerships(undefined, coOwner.id, true);
      
      // Lấy danh sách group IDs từ ownerships
      const groupIds = [...new Set(allOwnerships.map(o => o.vehicleGroupId))];
      
      // Lấy tất cả groups và vehicles từ booking service
      const [allGroups, vehiclesFromBooking] = await Promise.all([
        ownershipService.getGroups(),
        bookingService.getVehicles(),
      ]);
      
      // Lọc chỉ những groups mà co-owner có quyền
      const userGroups = allGroups.filter(g => groupIds.includes(g.id));
      
      setGroups(userGroups);
      if (userGroups.length > 0 && !selectedGroupId) {
        const firstGroup = userGroups[0];
        setSelectedGroupId(firstGroup.id);
        
        // Map group sang vehicleId từ booking service
        const matchingVehicle = vehiclesFromBooking.find(v => 
          v.name.toLowerCase() === firstGroup.vehicleName.toLowerCase()
        );
        
        if (matchingVehicle) {
          console.log('[UsageAnalytics] Mapped group to vehicleId:', matchingVehicle.id, 'for group:', firstGroup.vehicleName);
          setSelectedVehicleId(matchingVehicle.id);
        } else {
          console.warn('[UsageAnalytics] Could not find matching vehicle for group:', firstGroup.vehicleName);
          // Fallback: try to find by partial name match
          const partialMatch = vehiclesFromBooking.find(v => 
            v.name.toLowerCase().includes(firstGroup.vehicleName.toLowerCase()) ||
            firstGroup.vehicleName.toLowerCase().includes(v.name.toLowerCase())
          );
          if (partialMatch) {
            console.log('[UsageAnalytics] Found partial match, using vehicleId:', partialMatch.id);
            setSelectedVehicleId(partialMatch.id);
          }
        }
      }
    } catch (err) {
      console.error("Không thể tải nhóm:", err);
    }
  };

  const loadFairnessCheck = async () => {
    if (!selectedGroupId) return;

    try {
      setLoadingFairness(true);
      const fairness = await aiService.getFairnessCheck({
        vehicle_group_id: selectedGroupId,
        period_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      });
      setFairnessCheck(fairness);
    } catch (err) {
      console.error("Không thể tải kiểm tra công bằng:", err);
    } finally {
      setLoadingFairness(false);
    }
  };

  const loadOwnerships = async () => {
    if (!selectedGroupId) return;
    try {
      const data = await ownershipService.getOwnerships(selectedGroupId, undefined, true);
      setOwnerships(data);
    } catch (err) {
      console.error("Không thể tải quyền sở hữu:", err);
    }
  };

  const loadBookings = async () => {
    try {
      const allBookings = await bookingService.getBookings();
      // Filter bookings by date range and group
      const filtered = allBookings.filter((booking) => {
        const bookingDate = new Date(booking.startTime);
        return bookingDate >= startDate && bookingDate <= endDate;
      });
      setBookings(filtered);
    } catch (err) {
      console.error("Không thể tải đặt chỗ:", err);
    }
  };

  const handleGroupChange = async (groupId: string) => {
    setSelectedGroupId(groupId);
    const group = groups.find((g) => g.id === groupId);
    _setSelectedGroup(group || null);
    if (group?.id) {
      try {
        // Map group sang vehicleId từ booking service
        const vehiclesFromBooking = await bookingService.getVehicles();
        const matchingVehicle = vehiclesFromBooking.find(v => 
          v.name.toLowerCase() === group.vehicleName.toLowerCase()
        );
        
        if (matchingVehicle) {
          console.log('[UsageAnalytics] Mapped group to vehicleId:', matchingVehicle.id, 'for group:', group.vehicleName);
          setSelectedVehicleId(matchingVehicle.id);
        } else {
          console.warn('[UsageAnalytics] Could not find matching vehicle for group:', group.vehicleName);
          // Fallback: try to find by partial name match
          const partialMatch = vehiclesFromBooking.find(v => 
            v.name.toLowerCase().includes(group.vehicleName.toLowerCase()) ||
            group.vehicleName.toLowerCase().includes(v.name.toLowerCase())
          );
          if (partialMatch) {
            console.log('[UsageAnalytics] Found partial match, using vehicleId:', partialMatch.id);
            setSelectedVehicleId(partialMatch.id);
          }
        }
      } catch (err) {
        console.error('[UsageAnalytics] Error mapping group to vehicleId:', err);
      }
    }
  };

  const handleDownloadCSV = async () => {
    if (!selectedVehicleId || !usageStats) return;

    try {
      const report = await reportService.generateUsageReport(
        selectedVehicleId,
        startDate,
        endDate
      );
      if (report) {
        // Parse report data and create CSV
        const reportData = JSON.parse(report.reportData);
        const csvRows = [
          ["Date", "Usage Count", "Distance (km)", "Cost (VND)"],
          ...Object.entries(reportData.dailyUsage || {}).map(([date, data]: [string, any]) => [
            date,
            data.UsageCount || 0,
            data.TotalDistance || 0,
            data.TotalCost || 0,
          ]),
        ];

        const csvContent = csvRows.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `usage-report-${startDate.toISOString().split("T")[0]}-${endDate.toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Không thể tải CSV:", err);
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) {
      return "0";
    }
    return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  // Prepare data for usage vs ownership chart
  const getUsageVsOwnershipData = () => {
    if (!ownerships.length || !bookings.length) return null;

    const userId = localStorage.getItem("userId");
    if (!userId) return null;

    // Get current user's ownership percentage
    const userOwnership = ownerships.find((o) => o.coOwnerId === userId);
    const ownershipPercentage = userOwnership?.ownershipPercentage || 0;

    // Calculate user's booking percentage
    // Try to match by coOwnerId
    const userBookings = bookings.filter((b) => {
      // Check if booking's coOwnerId matches any ownership's coOwnerId for this user
      const matchingOwnership = ownerships.find((o) => 
        o.coOwnerId === userId && 
        o.coOwnerId === b.coOwnerId.toString()
      );
      return matchingOwnership !== undefined || b.coOwnerId.toString() === userId;
    });
    const totalBookings = bookings.length;
    const userBookingPercentage = totalBookings > 0 ? (userBookings.length / totalBookings) * 100 : 0;

    return {
      ownership: ownershipPercentage,
      booking: userBookingPercentage,
    };
  };

  // Prepare data for booking frequency chart
  const getBookingFrequencyData = () => {
    if (!bookings.length) return null;

    // Group bookings by date
    const bookingsByDate: { [key: string]: number } = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.startTime).toISOString().split("T")[0];
      bookingsByDate[date] = (bookingsByDate[date] || 0) + 1;
    });

    // Sort dates
    const sortedDates = Object.keys(bookingsByDate).sort();
    
    return {
      dates: sortedDates,
      counts: sortedDates.map((date) => bookingsByDate[date]),
    };
  };

  const usageVsOwnershipData = getUsageVsOwnershipData();
  const bookingFrequencyData = getBookingFrequencyData();

  return (
    <>
      <PageMeta title="Đồng sở hữu | Phân Tích Sử Dụng" />
      <PageHeader
        title="Phân Tích Sử Dụng"
        description="So sánh thói quen lái xe của bạn với mức trung bình của nhóm và tìm cơ hội tiết kiệm chi phí."
        actions={
          <Button size="sm" onClick={handleDownloadCSV} disabled={!usageStats}>
            Tải CSV
          </Button>
        }
      />

      <div className="mb-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <Label>Nhóm Xe</Label>
            <Select
              value={selectedGroupId}
              onChange={(value) => handleGroupChange(value)}
            >
              <option value="">Chọn nhóm xe</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} - {group.vehicleName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Ngày Bắt Đầu</Label>
            <Input
              type="date"
              value={startDate.toISOString().split("T")[0]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(new Date(e.target.value))}
            />
          </div>
          <div>
            <Label>Ngày Kết Thúc</Label>
            <Input
              type="date"
              value={endDate.toISOString().split("T")[0]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(new Date(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              onClick={loadStatistics}
              disabled={!selectedVehicleId || loading}
              className="w-full"
            >
              {loading ? "Đang tải..." : "Làm Mới"}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {usageStats && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tổng Sử Dụng
              </h3>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
                {formatNumber(usageStats.totalUsageCount)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">lần</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tổng Quãng Đường
              </h3>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
                {formatNumber(usageStats.totalDistance)} km
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Trung bình: {formatNumber(usageStats.averageDistancePerUsage)} km/chuyến
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tổng Chi Phí
              </h3>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
                ₫{formatNumber(usageStats.totalCost)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Hiệu suất năng lượng: {formatNumber(usageStats.energyEfficiency)} km/kWh
              </p>
            </div>
          </div>
        )}

        {/* Usage vs Ownership Chart */}
        {usageVsOwnershipData && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
              Tỷ Lệ Sử Dụng vs. Sở Hữu
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              So sánh tỷ lệ đặt chỗ thực tế của bạn với tỷ lệ sở hữu của bạn.
            </p>
            <div className="mt-6">
              <Chart
                options={{
                  chart: {
                    type: "bar",
                    fontFamily: "Outfit, sans-serif",
                    toolbar: { show: false },
                  },
                  colors: ["#465FFF", "#9CB9FF"],
                  plotOptions: {
                    bar: {
                      horizontal: false,
                      columnWidth: "55%",
                      borderRadius: 4,
                    },
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: (val: number) => `${val.toFixed(1)}%`,
                  },
                  xaxis: {
                    categories: ["Tỷ Lệ Sở Hữu %", "Tỷ Lệ Đặt Chỗ %"],
                    labels: {
                      style: {
                        fontSize: "12px",
                        colors: ["#6B7280"],
                      },
                    },
                  },
                  yaxis: {
                    labels: {
                      style: {
                        fontSize: "12px",
                        colors: ["#6B7280"],
                      },
                      formatter: (val: number) => `${val.toFixed(1)}%`,
                    },
                    max: 100,
                  },
                  tooltip: {
                    y: {
                      formatter: (val: number) => `${val.toFixed(1)}%`,
                    },
                  },
                  legend: {
                    show: false,
                  },
                }}
                series={[
                  {
                    name: "Tỷ Lệ",
                    data: [usageVsOwnershipData.ownership, usageVsOwnershipData.booking],
                  },
                ]}
                type="bar"
                height={310}
              />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Chênh lệch: {Math.abs(usageVsOwnershipData.ownership - usageVsOwnershipData.booking).toFixed(1)}%
              </span>
              <span className={`text-sm font-semibold ${
                Math.abs(usageVsOwnershipData.ownership - usageVsOwnershipData.booking) < 5
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}>
                {Math.abs(usageVsOwnershipData.ownership - usageVsOwnershipData.booking) < 5
                  ? "✓ Cân Bằng"
                  : "⚠ Cần Điều Chỉnh"}
              </span>
            </div>
          </div>
        )}

        {/* Booking Frequency Chart */}
        {bookingFrequencyData && bookingFrequencyData.dates.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
              Tần Suất Đặt Chỗ
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Số lượng đặt chỗ mỗi ngày trong khoảng thời gian đã chọn.
            </p>
            <div className="mt-6">
              <Chart
                options={{
                  chart: {
                    type: "line",
                    fontFamily: "Outfit, sans-serif",
                    height: 310,
                    toolbar: { show: false },
                  },
                  colors: ["#465FFF"],
                  stroke: {
                    curve: "smooth",
                    width: 2,
                  },
                  fill: {
                    type: "gradient",
                    gradient: {
                      opacityFrom: 0.55,
                      opacityTo: 0,
                    },
                  },
                  markers: {
                    size: 4,
                    strokeColors: "#465FFF",
                    strokeWidth: 2,
                    hover: {
                      size: 6,
                    },
                  },
                  grid: {
                    xaxis: {
                      lines: {
                        show: false,
                      },
                    },
                    yaxis: {
                      lines: {
                        show: true,
                      },
                    },
                  },
                  dataLabels: {
                    enabled: false,
                  },
                  tooltip: {
                    enabled: true,
                    x: {
                      format: "dd MMM yyyy",
                    },
                  },
                  xaxis: {
                    type: "category",
                    categories: bookingFrequencyData.dates.map((date) => {
                      const d = new Date(date);
                      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }),
                    labels: {
                      style: {
                        fontSize: "12px",
                        colors: ["#6B7280"],
                      },
                      rotate: -45,
                    },
                  },
                  yaxis: {
                    labels: {
                      style: {
                        fontSize: "12px",
                        colors: ["#6B7280"],
                      },
                    },
                    title: {
                      text: "Số Lượng Đặt Chỗ",
                      style: {
                        fontSize: "12px",
                        color: "#6B7280",
                      },
                    },
                  },
                }}
                series={[
                  {
                    name: "Đặt Chỗ",
                    data: bookingFrequencyData.counts,
                  },
                ]}
                type="line"
                height={310}
              />
            </div>
          </div>
        )}

        {costStats && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
              Phân Tích Chi Phí
            </h2>
            <div className="mt-4 space-y-3">
              {costStats.costByType && Object.entries(costStats.costByType).map(([type, cost]) => (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/30"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {type}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white/90">
                    ₫{formatNumber(cost)}
                  </span>
                </div>
              ))}
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-800">
                <span className="text-sm font-semibold text-gray-900 dark:text-white/90">
                  Chi Phí Trung Bình Hàng Tháng
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white/90">
                  ₫{formatNumber(costStats.averageMonthlyCost)}
                </span>
              </div>
            </div>
          </div>
        )}

        {fairnessCheck && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
              Kiểm Tra Công Bằng Sử Dụng
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Điểm Công Bằng
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-2 rounded-full ${
                        fairnessCheck.fairness_score >= 0.7
                          ? "bg-emerald-500"
                          : fairnessCheck.fairness_score >= 0.5
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${fairnessCheck.fairness_score * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white/90">
                    {(fairnessCheck.fairness_score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              {fairnessCheck.recommendations && fairnessCheck.recommendations.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
                  <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                    Đề Xuất:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {fairnessCheck.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {!usageStats && !loading && selectedVehicleId && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <p className="font-medium text-gray-700 dark:text-gray-200">
              Không có dữ liệu
            </p>
            <p className="mt-2">
              Không tìm thấy thống kê sử dụng cho khoảng thời gian đã chọn. Vui lòng thử điều chỉnh phạm vi ngày.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default UsageAnalytics;
