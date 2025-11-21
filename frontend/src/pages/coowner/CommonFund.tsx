import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, VehicleGroup, GroupFund, FundTransaction } from "../../services/ownershipService";
import { paymentService, CostShare, CostType } from "../../services/paymentService";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";

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
  const [groupFunds, setGroupFunds] = useState<GroupFund[]>([]);
  const [fundTransactions, setFundTransactions] = useState<FundTransaction[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateTransactionModalOpen, setIsCreateTransactionModalOpen] = useState(false);
  const [transactionFormData, setTransactionFormData] = useState({
    fundId: "",
    type: "Contribution",
    amount: 0,
    description: "",
    category: "",
    receiptNumber: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });
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
      loadGroupFunds(selectedGroupId);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedFundId) {
      loadFundTransactions(selectedFundId);
    }
  }, [selectedFundId]);

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

  const loadGroupFunds = async (groupId: string) => {
    try {
      const funds = await ownershipService.getGroupFunds(groupId);
      setGroupFunds(funds);
      if (funds.length > 0 && !selectedFundId) {
        setSelectedFundId(funds[0].id);
      }
    } catch (err) {
      console.error("Failed to load group funds:", err);
    }
  };

  const loadFundTransactions = async (fundId: string) => {
    try {
      const transactions = await ownershipService.getFundTransactions(fundId);
      setFundTransactions(transactions);
    } catch (err) {
      console.error("Failed to load fund transactions:", err);
    }
  };

  const handleCreateTransaction = () => {
    if (!selectedFundId) {
      setError("Please select a fund first");
      return;
    }
    setTransactionFormData({
      fundId: selectedFundId,
      type: "Contribution",
      amount: 0,
      description: "",
      category: "",
      receiptNumber: "",
      transactionDate: new Date().toISOString().split("T")[0],
    });
    setIsCreateTransactionModalOpen(true);
  };

  const handleSaveTransaction = async () => {
    try {
      if (!transactionFormData.fundId || !transactionFormData.amount || transactionFormData.amount <= 0) {
        setError("Please fill in all required fields");
        return;
      }
      await ownershipService.createFundTransaction(transactionFormData.fundId, {
        type: transactionFormData.type,
        amount: transactionFormData.amount,
        description: transactionFormData.description || undefined,
        category: transactionFormData.category || undefined,
        receiptNumber: transactionFormData.receiptNumber || undefined,
        transactionDate: transactionFormData.transactionDate || undefined,
      });
      setIsCreateTransactionModalOpen(false);
      if (selectedFundId) {
        await loadFundTransactions(selectedFundId);
        await loadGroupFunds(selectedGroupId);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transaction");
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
        actions={
          selectedGroupId && groupFunds.length > 0 ? (
            <Button size="sm" onClick={handleCreateTransaction}>
              Add Transaction
            </Button>
          ) : null
        }
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

          {/* Group Funds */}
          {groupFunds.length > 0 && (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                  Group Funds
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select a fund to view transactions
                </p>
              </div>
              <div className="p-4">
                <Select
                  value={selectedFundId}
                  onChange={(value) => setSelectedFundId(value)}
                >
                  <option value="">Select a fund</option>
                  {groupFunds.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {fund.name} - Balance: {formatAmount(fund.balance)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {/* Fund Transactions */}
          {selectedFundId && (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      Fund Transactions
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Contributions and expenses for selected fund
                    </p>
                  </div>
                  <Button size="sm" onClick={handleCreateTransaction}>
                    Add Transaction
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {fundTransactions.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No transactions found.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {fundTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className={`flex items-center justify-between rounded-lg border p-4 ${
                          transaction.type === "Contribution"
                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                            : "border-red-200 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-gray-900 dark:text-white/90">
                              {transaction.description || transaction.type}
                            </h4>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                              transaction.type === "Contribution"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                            }`}>
                              {transaction.type}
                            </span>
                            {transaction.status === "Pending" && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                Pending Approval
                              </span>
                            )}
                          </div>
                          {transaction.category && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Category: {transaction.category}
                            </p>
                          )}
                          {transaction.receiptNumber && (
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              Receipt: {transaction.receiptNumber}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(transaction.transactionDate || transaction.createdAt)} • By: {transaction.coOwnerName || transaction.coOwnerId.substring(0, 8)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${
                            transaction.type === "Contribution"
                              ? "text-emerald-700 dark:text-emerald-200"
                              : "text-red-700 dark:text-red-200"
                          }`}>
                            {transaction.type === "Contribution" ? "+" : "-"}
                            {formatAmount(transaction.amount)}
                          </p>
                          {transaction.status === "Pending" && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await ownershipService.approveFundTransaction(transaction.id);
                                  await loadFundTransactions(selectedFundId);
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Failed to approve");
                                }
                              }}
                              className="mt-2"
                            >
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fund History (Cost Shares) */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Cost Shares History
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

      {/* Create Fund Transaction Modal */}
      <Modal
        isOpen={isCreateTransactionModalOpen}
        onClose={() => {
          setIsCreateTransactionModalOpen(false);
          setError(null);
        }}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Add Fund Transaction
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Record a contribution or expense for the group fund.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveTransaction();
            }}
            className="px-2 space-y-4"
          >
            {error && (
              <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                {error}
              </div>
            )}

            <div>
              <Label>Fund <span className="text-error-500">*</span></Label>
              <Select
                value={transactionFormData.fundId}
                onChange={(value) => setTransactionFormData({ ...transactionFormData, fundId: value })}
                required
              >
                <option value="">Select a fund</option>
                {groupFunds.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.name} - Balance: {formatAmount(fund.balance)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Transaction Type <span className="text-error-500">*</span></Label>
              <Select
                value={transactionFormData.type}
                onChange={(value) => setTransactionFormData({ ...transactionFormData, type: value })}
                required
              >
                <option value="Contribution">Contribution</option>
                <option value="Expense">Expense</option>
              </Select>
            </div>

            <div>
              <Label>Amount <span className="text-error-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={transactionFormData.amount === 0 ? "" : transactionFormData.amount}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="Enter amount"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                type="text"
                value={transactionFormData.description}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Input
                type="text"
                value={transactionFormData.category}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, category: e.target.value })}
                placeholder="e.g., Maintenance, Insurance, etc."
              />
            </div>

            <div>
              <Label>Receipt Number</Label>
              <Input
                type="text"
                value={transactionFormData.receiptNumber}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, receiptNumber: e.target.value })}
                placeholder="Enter receipt number (if any)"
              />
            </div>

            <div>
              <Label>Transaction Date</Label>
              <Input
                type="date"
                value={transactionFormData.transactionDate}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, transactionDate: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center gap-3 lg:justify-end mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsCreateTransactionModalOpen(false);
                  setError(null);
                }}
                type="button"
              >
                Cancel
              </Button>
              <Button size="sm" type="submit">
                Create Transaction
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};

export default CommonFund;

