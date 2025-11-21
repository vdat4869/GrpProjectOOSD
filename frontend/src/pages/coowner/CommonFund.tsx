import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";
import { paymentService, CostShare, CostType } from "../../services/paymentService";

interface FundSummary {
  maintenanceFund: number;
  reserveFund: number;
  totalContributions: number;
  totalExpenses: number;
  balance: number;
}

const CommonFund: React.FC = () => {
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [costShares, setCostShares] = useState<CostShare[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fundSummary, setFundSummary] = useState<FundSummary>({
    maintenanceFund: 0,
    reserveFund: 0,
    totalContributions: 0,
    totalExpenses: 0,
    balance: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadCostShares(selectedGroupId);
    }
  }, [selectedGroupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ownershipService.getGroups();
      setGroups(data);
      if (data.length > 0) {
        setSelectedGroupId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const loadCostShares = async (groupId: string) => {
    try {
      const allCostShares = await paymentService.getCostShares();
      const groupCostShares = allCostShares.filter((cs) => cs.groupId === groupId);
      setCostShares(groupCostShares);

      // Calculate fund summary
      const maintenance = groupCostShares
        .filter((cs) => cs.costType === CostType.Maintenance)
        .reduce((sum, cs) => sum + cs.totalAmount, 0);
      
      const reserve = groupCostShares
        .filter((cs) => cs.costType === CostType.Other)
        .reduce((sum, cs) => sum + cs.totalAmount, 0);

      const totalContributions = groupCostShares.reduce((sum, cs) => sum + cs.totalAmount, 0);
      const totalExpenses = groupCostShares
        .filter((cs) => cs.status === 2) // Completed
        .reduce((sum, cs) => sum + cs.totalAmount, 0);

      setFundSummary({
        maintenanceFund: maintenance,
        reserveFund: reserve,
        totalContributions,
        totalExpenses,
        balance: totalContributions - totalExpenses,
      });
    } catch (err) {
      console.error("Failed to load cost shares:", err);
    }
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

  const getCostTypeLabel = (type: CostType) => {
    switch (type) {
      case CostType.Maintenance:
        return "Maintenance";
      case CostType.Insurance:
        return "Insurance";
      case CostType.Charging:
        return "Charging";
      case CostType.Registration:
        return "Registration";
      case CostType.Cleaning:
        return "Cleaning";
      case CostType.Parking:
        return "Parking";
      case CostType.Toll:
        return "Toll";
      case CostType.Other:
        return "Reserve Fund";
      default:
        return "Other";
    }
  };

  return (
    <>
      <PageMeta title="Co-owner | Common Fund" />
      <PageHeader
        title="Common Fund Management"
        description="View and manage maintenance fund, reserve fund, and transparent fund history for your vehicle group."
      />

      {/* Group Selector */}
      {groups.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Vehicle Group
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} - {group.vehicleName}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading fund information...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Fund Summary Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-theme-xs dark:border-blue-500/40 dark:bg-blue-500/10">
              <p className="text-sm text-blue-600 dark:text-blue-300">Maintenance Fund</p>
              <p className="mt-1 text-2xl font-semibold text-blue-700 dark:text-blue-200">
                {formatAmount(fundSummary.maintenanceFund)}
              </p>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 shadow-theme-xs dark:border-purple-500/40 dark:bg-purple-500/10">
              <p className="text-sm text-purple-600 dark:text-purple-300">Reserve Fund</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700 dark:text-purple-200">
                {formatAmount(fundSummary.reserveFund)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-theme-xs dark:border-emerald-500/40 dark:bg-emerald-500/10">
              <p className="text-sm text-emerald-600 dark:text-emerald-300">Total Contributions</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-200">
                {formatAmount(fundSummary.totalContributions)}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-theme-xs dark:border-amber-500/40 dark:bg-amber-500/10">
              <p className="text-sm text-amber-600 dark:text-amber-300">Balance</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-200">
                {formatAmount(fundSummary.balance)}
              </p>
            </div>
          </div>

          {/* Fund History */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Fund History
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Transparent history of all contributions and expenses
              </p>
            </div>

            <div className="p-4">
              {costShares.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No fund transactions found.
                </p>
              ) : (
                <div className="space-y-3">
                  {costShares.map((costShare) => (
                    <div
                      key={costShare.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-gray-900 dark:text-white/90">
                            {costShare.title}
                          </h4>
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {getCostTypeLabel(costShare.costType)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {costShare.description || "No description"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(costShare.createdAt)} • Due: {formatDate(costShare.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
                          {formatAmount(costShare.totalAmount)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {costShare.status === 2 ? "Paid" : "Pending"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default CommonFund;

