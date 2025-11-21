import { useEffect, useState } from "react";
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

const UsageAnalytics: React.FC = () => {
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
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
  }, [selectedVehicleId, selectedGroupId, startDate, endDate]);

  const loadGroups = async () => {
    try {
      const data = await ownershipService.getGroups();
      setGroups(data);
      if (data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id);
        // Use group id as vehicle identifier (simplified - would need proper vehicle mapping)
        setSelectedVehicleId(parseInt(data[0].id.replace(/-/g, "").substring(0, 8), 16) || 1);
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  };

  const loadStatistics = async () => {
    if (!selectedVehicleId) return;

    try {
      setLoading(true);
      setError(null);
      const [usage, cost] = await Promise.all([
        reportService.getUsageStatistics(selectedVehicleId, startDate, endDate),
        reportService.getCostStatistics(selectedVehicleId, startDate, endDate),
      ]);
      setUsageStats(usage);
      setCostStats(cost);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statistics");
    } finally {
      setLoading(false);
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
      console.error("Failed to load fairness check:", err);
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
      console.error("Failed to load ownerships:", err);
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
      console.error("Failed to load bookings:", err);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    const group = groups.find((g) => g.id === groupId);
    _setSelectedGroup(group || null);
    if (group?.id) {
      // Use group id as vehicle identifier (simplified - would need proper vehicle mapping)
      setSelectedVehicleId(parseInt(group.id.replace(/-/g, "").substring(0, 8), 16) || 1);
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
      console.error("Failed to download CSV:", err);
    }
  };

  const formatNumber = (num: number) => {
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
      <PageMeta title="Co-owner | Usage Analytics" />
      <PageHeader
        title="Usage Analytics"
        description="Compare your driving habits with group averages and surface cost-saving opportunities."
        actions={
          <Button size="sm" onClick={handleDownloadCSV} disabled={!usageStats}>
            Download CSV
          </Button>
        }
      />

      <div className="mb-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <Label>Vehicle Group</Label>
            <Select
              value={selectedGroupId}
              onChange={(value) => handleGroupChange(value)}
            >
              <option value="">Select a group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} - {group.vehicleName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate.toISOString().split("T")[0]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(new Date(e.target.value))}
            />
          </div>
          <div>
            <Label>End Date</Label>
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
              {loading ? "Loading..." : "Refresh"}
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
                Total Usage
              </h3>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
                {formatNumber(usageStats.totalUsageCount)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">times</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Distance
              </h3>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
                {formatNumber(usageStats.totalDistance)} km
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Avg: {formatNumber(usageStats.averageDistancePerUsage)} km/trip
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Cost
              </h3>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
                ₫{formatNumber(usageStats.totalCost)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Energy Efficiency: {formatNumber(usageStats.energyEfficiency)} km/kWh
              </p>
            </div>
          </div>
        )}

        {/* Usage vs Ownership Chart */}
        {usageVsOwnershipData && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
              Usage vs. Ownership Ratio
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Compare your actual booking percentage with your ownership percentage.
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
                    categories: ["Ownership %", "Booking %"],
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
                    name: "Percentage",
                    data: [usageVsOwnershipData.ownership, usageVsOwnershipData.booking],
                  },
                ]}
                type="bar"
                height={310}
              />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Difference: {Math.abs(usageVsOwnershipData.ownership - usageVsOwnershipData.booking).toFixed(1)}%
              </span>
              <span className={`text-sm font-semibold ${
                Math.abs(usageVsOwnershipData.ownership - usageVsOwnershipData.booking) < 5
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}>
                {Math.abs(usageVsOwnershipData.ownership - usageVsOwnershipData.booking) < 5
                  ? "✓ Balanced"
                  : "⚠ Needs Adjustment"}
              </span>
            </div>
          </div>
        )}

        {/* Booking Frequency Chart */}
        {bookingFrequencyData && bookingFrequencyData.dates.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
              Booking Frequency
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Number of bookings per day in the selected period.
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
                      text: "Number of Bookings",
                      style: {
                        fontSize: "12px",
                        color: "#6B7280",
                      },
                    },
                  },
                }}
                series={[
                  {
                    name: "Bookings",
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
              Cost Breakdown
            </h2>
            <div className="mt-4 space-y-3">
              {Object.entries(costStats.costByType).map(([type, cost]) => (
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
                  Average Monthly Cost
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
              Usage Fairness Check
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Fairness Score
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
                    Recommendations:
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
              No data available
            </p>
            <p className="mt-2">
              No usage statistics found for the selected period. Try adjusting the date range.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default UsageAnalytics;
