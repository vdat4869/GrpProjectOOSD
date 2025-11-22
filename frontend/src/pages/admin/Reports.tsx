import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import Select from "../../components/form/Select";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import {
  reportService,
  AnalyticsReport,
} from "../../services/reportService";
import { ownershipService, VehicleGroup, Ownership } from "../../services/ownershipService";
import { bookingService, Booking } from "../../services/bookingService";

const Reports: React.FC = () => {
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [reportType, setReportType] = useState<string>("usage");
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [ownerships, setOwnerships] = useState<Ownership[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      loadReports();
    }
    if (selectedGroupId) {
      loadOwnerships();
      loadBookings();
    }
  }, [selectedVehicleId, selectedGroupId]);

  const loadGroups = async () => {
    try {
      const [groupsData, allBookings] = await Promise.all([
        ownershipService.getGroups(),
        bookingService.getBookings()
      ]);
      setGroups(groupsData);
      setBookings(allBookings);
      
      if (groupsData.length > 0 && !selectedGroupId) {
        const firstGroupId = groupsData[0].id;
        setSelectedGroupId(firstGroupId);
        
        // Get vehicleId from bookings if available
        if (allBookings.length > 0) {
          // Use the first booking's vehicleId as default
          // In a real system, you'd need proper mapping between group and vehicle
          setSelectedVehicleId(allBookings[0].vehicleId);
        } else {
          setSelectedVehicleId(null);
          console.warn("No bookings found, cannot determine vehicleId");
        }
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  };

  const loadReports = async () => {
    if (!selectedVehicleId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getReportsByVehicle(selectedVehicleId);
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = async (groupId: string) => {
    setSelectedGroupId(groupId);
    const group = groups.find((g) => g.id === groupId);
    if (group?.id) {
      // Load ownerships to get co-owners in this group
      try {
        const [ownershipsData, allBookings] = await Promise.all([
          ownershipService.getOwnerships(groupId, undefined, true),
          bookingService.getBookings()
        ]);
        
        setOwnerships(ownershipsData);
        setBookings(allBookings);
        
        // Get vehicleId from bookings
        // Note: coOwnerId in Ownership might be GUID, but in Booking it's int
        // So we need to find booking by matching coOwner names or use the first booking's vehicleId
        // For now, use the first booking's vehicleId if available, or parse from group ID
        if (allBookings.length > 0) {
          // Use the first booking's vehicleId as default
          // In a real system, you'd need proper mapping between group and vehicle
          setSelectedVehicleId(allBookings[0].vehicleId);
        } else {
          // If no bookings exist, set to null or a default value
          setSelectedVehicleId(null);
          console.warn("No bookings found, cannot determine vehicleId for this group");
        }
      } catch (err) {
        console.error("Failed to load group data:", err);
        setSelectedVehicleId(null);
      }
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
      setBookings(allBookings);
    } catch (err) {
      console.error("Failed to load bookings:", err);
    }
  };

  // Calculate usage comparison data
  const getUsageComparisonData = () => {
    if (!ownerships.length || !bookings.length) return [];

    // Group bookings by coOwnerId (booking.coOwnerId is number, ownership.coOwnerId is string)
    const bookingsByCoOwner: { [key: string]: Booking[] } = {};
    bookings.forEach((booking) => {
      const coOwnerId = booking.coOwnerId.toString();
      if (!bookingsByCoOwner[coOwnerId]) {
        bookingsByCoOwner[coOwnerId] = [];
      }
      bookingsByCoOwner[coOwnerId].push(booking);
    });

    // Calculate usage statistics for each co-owner
    return ownerships.map((ownership) => {
      // Try to match bookings by coOwnerId (convert both to string for comparison)
      const coOwnerBookings = bookingsByCoOwner[ownership.coOwnerId] || [];
      const totalBookings = bookings.length;
      const bookingPercentage = totalBookings > 0 ? (coOwnerBookings.length / totalBookings) * 100 : 0;
      const totalDistance = coOwnerBookings.reduce((sum, b) => sum + (b.distanceKm || 0), 0);
      const totalCost = coOwnerBookings.reduce((sum, b) => sum + (b.cost || 0), 0);

      return {
        coOwnerName: ownership.coOwnerName || ownership.coOwnerId.substring(0, 8),
        ownershipPercentage: ownership.ownershipPercentage,
        bookingCount: coOwnerBookings.length,
        bookingPercentage: bookingPercentage,
        totalDistance: totalDistance,
        totalCost: totalCost,
        difference: bookingPercentage - ownership.ownershipPercentage,
      };
    });
  };

  const usageComparisonData = getUsageComparisonData();

  const handleGenerateReport = async () => {
    if (!selectedVehicleId) {
      setError("Please select a vehicle");
      setSuccessMessage(null);
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccessMessage(null);
      let report: AnalyticsReport | null = null;

      switch (reportType) {
        case "usage":
          report = await reportService.generateUsageReport(
            selectedVehicleId,
            startDate,
            endDate
          );
          break;
        case "cost":
          report = await reportService.generateCostReport(
            selectedVehicleId,
            startDate,
            endDate
          );
          break;
        case "maintenance":
          report = await reportService.generateMaintenanceReport(
            selectedVehicleId,
            startDate,
            endDate
          );
          break;
      }

      if (report) {
        setSuccessMessage(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully!`);
        await loadReports();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError("Failed to generate report. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
      setSuccessMessage(null);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportReport = (report: AnalyticsReport, format: "csv" | "pdf" | "excel" = "csv") => {
    try {
      const reportData = JSON.parse(report.reportData);
      
      if (format === "csv") {
        const csvRows = [
          ["Report Type", report.reportType],
          ["Period", `${report.periodStart} to ${report.periodEnd}`],
          ["Generated At", report.generatedAt],
          [],
          ...Object.entries(reportData).map(([key, value]) => [
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value),
          ]),
        ];

        const csvContent = csvRows.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${report.reportType}-report-${report.id}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (format === "excel") {
        // Excel export (using CSV format with .xlsx extension - simplified)
        // For full Excel support, would need a library like xlsx
        const csvRows = [
          ["Report Type", report.reportType],
          ["Period", `${report.periodStart} to ${report.periodEnd}`],
          ["Generated At", report.generatedAt],
          [],
          ...Object.entries(reportData).map(([key, value]) => [
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value),
          ]),
        ];

        const csvContent = csvRows.map((row) => row.join("\t")).join("\n");
        const blob = new Blob([csvContent], { type: "application/vnd.ms-excel" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${report.reportType}-report-${report.id}.xls`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (format === "pdf") {
        // PDF export - generate HTML and use browser print
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>${report.reportType} Report</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 20px;
                  color: #333;
                }
                h1 {
                  color: #1f2937;
                  border-bottom: 2px solid #1f2937;
                  padding-bottom: 10px;
                }
                .info {
                  margin: 20px 0;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 8px 0;
                  border-bottom: 1px solid #e5e7eb;
                }
                .info-label {
                  font-weight: bold;
                  color: #6b7280;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                }
                th, td {
                  border: 1px solid #d1d5db;
                  padding: 8px;
                  text-align: left;
                }
                th {
                  background-color: #f3f4f6;
                  font-weight: bold;
                }
                @media print {
                  body {
                    padding: 0;
                  }
                }
              </style>
            </head>
            <body>
              <h1>${report.reportType} Report</h1>
              <div class="info">
                <div class="info-row">
                  <span class="info-label">Period:</span>
                  <span>${report.periodStart} to ${report.periodEnd}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Generated At:</span>
                  <span>${report.generatedAt}</span>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(reportData).map(([key, value]) => `
                    <tr>
                      <td>${key}</td>
                      <td>${typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </body>
          </html>
        `;

        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
      }
    } catch (err) {
      console.error("Failed to export report:", err);
      setError("Failed to export report. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <>
      <PageMeta title="Admin | Reports" />
      <PageHeader
        title="Executive Reports"
        description="Generate system-wide analytics and export share-ready summaries for leadership and stakeholders."
      />

      <div className="mb-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
          Generate New Report
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
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
            <Label>Report Type</Label>
                <Select
                  value={reportType}
                  onChange={(value) => setReportType(value)}
                >
                  <option value="usage">Usage Report</option>
                  <option value="cost">Cost Report</option>
                  <option value="maintenance">Maintenance Report</option>
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
              onClick={handleGenerateReport}
              disabled={!selectedVehicleId || generating}
              className="w-full"
            >
              {generating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-6 shadow-theme-xs dark:border-green-500/40 dark:bg-green-500/10">
          <p className="text-green-600 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      {/* Usage Comparison Table */}
      {usageComparisonData.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-6 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
              Usage Comparison by Member
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Compare each member's actual usage with their ownership percentage
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Ownership %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Booking Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Booking %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total Distance (km)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total Cost (₫)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900">
                {usageComparisonData.map((data, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white/90">
                      {data.coOwnerName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      {data.ownershipPercentage.toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      {data.bookingCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      {data.bookingPercentage.toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      {data.totalDistance.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      ₫{data.totalCost.toLocaleString()}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 font-semibold ${
                      Math.abs(data.difference) < 5
                        ? "text-emerald-600 dark:text-emerald-400"
                        : data.difference > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`}>
                      {data.difference > 0 ? "+" : ""}{data.difference.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "Usage Summary",
            description: "Daily and monthly utilization metrics across all shared vehicles.",
            type: "usage",
          },
          {
            title: "Financial Health",
            description: "Revenue, expense, and outstanding balance insights from the payment service.",
            type: "cost",
          },
          {
            title: "Operational KPIs",
            description: "Staff throughput, maintenance turn-around, and SLA adherence by cohort.",
            type: "maintenance",
          },
        ].map(({ title, description, type }) => (
          <div
            key={title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
              {title}
            </h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{description}</p>
            <Button
              size="xs"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setReportType(type);
                handleGenerateReport();
              }}
              disabled={!selectedVehicleId || generating}
            >
              Generate {title}
            </Button>
          </div>
        ))}
      </div>

      {selectedVehicleId && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-6 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
              Generated Reports
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Reports for {selectedGroup?.vehicleName || "selected vehicle"}
            </p>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              No reports generated yet. Generate a report to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white/90">
                      {report.reportType} Report
                    </h4>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Period: {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Generated: {formatDate(report.generatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleExportReport(report, "csv")}
                    >
                      CSV
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleExportReport(report, "excel")}
                    >
                      Excel
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleExportReport(report, "pdf")}
                    >
                      PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Reports;
