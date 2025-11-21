import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { paymentService, CostShare, PaymentStatus } from "../../services/paymentService";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";

const ManageCosts: React.FC = () => {
  const [costShares, setCostShares] = useState<CostShare[]>([]);
  const [vehicles, setVehicles] = useState<VehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "overdue">("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [costSharesData, vehiclesData] = await Promise.all([
        paymentService.getCostShares(),
        ownershipService.getGroups(),
      ]);
      setCostShares(costSharesData);
      setVehicles(vehiclesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cost shares");
    } finally {
      setLoading(false);
    }
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle?.vehicleName || vehicleId.substring(0, 8);
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.Completed:
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300";
      case PaymentStatus.Processing:
        return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
      case PaymentStatus.Failed:
        return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300";
      case PaymentStatus.Cancelled:
        return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
      default:
        return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.Pending:
        return "Pending";
      case PaymentStatus.Processing:
        return "Processing";
      case PaymentStatus.Completed:
        return "Completed";
      case PaymentStatus.Failed:
        return "Failed";
      case PaymentStatus.Cancelled:
        return "Cancelled";
      case PaymentStatus.Refunded:
        return "Refunded";
      default:
        return "Unknown";
    }
  };

  const isOverdue = (costShare: CostShare) => {
    const dueDate = new Date(costShare.dueDate);
    const now = new Date();
    return costShare.status === PaymentStatus.Pending && now > dueDate;
  };

  const filteredCostShares = () => {
    let filtered = costShares;
    
    if (filter === "pending") {
      filtered = filtered.filter((cs) => cs.status === PaymentStatus.Pending);
    } else if (filter === "completed") {
      filtered = filtered.filter((cs) => cs.status === PaymentStatus.Completed);
    } else if (filter === "overdue") {
      filtered = filtered.filter((cs) => isOverdue(cs));
    }

    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      filtered = filtered.filter((cs) => {
        const created = new Date(cs.createdAt);
        return created >= start && created <= end;
      });
    }

    return filtered;
  };

  const calculateTotals = () => {
    const filtered = filteredCostShares();
    const total = filtered.reduce((sum, cs) => sum + cs.totalAmount, 0);
    const pending = filtered
      .filter((cs) => cs.status === PaymentStatus.Pending)
      .reduce((sum, cs) => sum + cs.totalAmount, 0);
    const completed = filtered
      .filter((cs) => cs.status === PaymentStatus.Completed)
      .reduce((sum, cs) => sum + cs.totalAmount, 0);
    return { total, pending, completed };
  };

  const formatAmount = (amount: number) => {
    return `₫${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const totals = calculateTotals();

  return (
    <>
      <PageMeta title="Admin | Manage Costs" />
      <PageHeader
        title="Cost & Payment Management"
        description="Monitor shared costs, payment status, and financial reports for all vehicle groups."
        actions={<Button size="sm" onClick={loadData} disabled={loading}>Refresh</Button>}
      />

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white/90">
            {formatAmount(totals.total)}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-theme-xs dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-sm text-amber-600 dark:text-amber-300">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-200">
            {formatAmount(totals.pending)}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-theme-xs dark:border-emerald-500/40 dark:bg-emerald-500/10">
          <p className="text-sm text-emerald-600 dark:text-emerald-300">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-200">
            {formatAmount(totals.completed)}
          </p>
        </div>
      </div>

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
          Pending
        </Button>
        <Button
          size="sm"
          variant={filter === "completed" ? "primary" : "outline"}
          onClick={() => setFilter("completed")}
        >
          Completed
        </Button>
        <Button
          size="sm"
          variant={filter === "overdue" ? "primary" : "outline"}
          onClick={() => setFilter("overdue")}
        >
          Overdue
        </Button>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading cost shares...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {filteredCostShares().length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">No cost shares found.</p>
            </div>
          ) : (
            filteredCostShares().map((costShare) => {
              const overdue = isOverdue(costShare);
              return (
                <div
                  key={costShare.id}
                  className={`overflow-hidden rounded-2xl border shadow-theme-xs ${
                    overdue
                      ? "border-error-200 bg-error-50 dark:border-error-500/40 dark:bg-error-500/10"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                  }`}
                >
                  <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                            {costShare.title}
                          </h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(costShare.status)}`}>
                            {getStatusLabel(costShare.status)}
                          </span>
                          {overdue && (
                            <span className="rounded-full bg-error-500 px-3 py-1 text-xs font-semibold text-white">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Vehicle: {getVehicleName(costShare.vehicleId)} • Amount: {formatAmount(costShare.totalAmount)}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Due: {formatDate(costShare.dueDate)} • Created: {formatDate(costShare.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {costShare.description && (
                    <div className="p-4 pt-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{costShare.description}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
};

export default ManageCosts;

