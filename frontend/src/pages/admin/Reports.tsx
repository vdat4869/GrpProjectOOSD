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
import { ownershipService, VehicleGroup } from "../../services/ownershipService";

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
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      loadReports();
    }
  }, [selectedVehicleId]);

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

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
      const group = groups.find((g) => g.id === groupId);
      if (group?.id) {
        // Use group id as vehicle identifier (simplified - would need proper vehicle mapping)
        setSelectedVehicleId(parseInt(group.id.replace(/-/g, "").substring(0, 8), 16) || 1);
      }
  };

  const handleGenerateReport = async () => {
    if (!selectedVehicleId) {
      setError("Please select a vehicle");
      return;
    }

    try {
      setGenerating(true);
      setError(null);
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
        await loadReports();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportReport = (report: AnalyticsReport) => {
    try {
      const reportData = JSON.parse(report.reportData);
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
    } catch (err) {
      console.error("Failed to export report:", err);
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
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleExportReport(report)}
                  >
                    Export CSV
                  </Button>
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
