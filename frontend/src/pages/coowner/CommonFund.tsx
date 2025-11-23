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

/**
 * Trang quản lý quỹ chung - xem và quản lý quỹ bảo dưỡng, quỹ dự trữ và lịch sử giao dịch
 */
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
    
    // Listen for payment completion events to refresh cost shares
    const handlePaymentCompleted = () => {
      console.log('[CommonFund] Payment completed, refreshing cost shares...');
      if (selectedGroupId) {
        // Delay a bit to ensure backend has updated
        setTimeout(() => {
          loadCostShares(selectedGroupId);
        }, 1500);
      }
    };
    
    window.addEventListener('paymentCompleted', handlePaymentCompleted);
    
    return () => {
      window.removeEventListener('paymentCompleted', handlePaymentCompleted);
    };
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
      
      // Lấy co-owner hiện tại
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        throw new Error("Không tìm thấy user. Vui lòng đăng nhập lại.");
      }
      
      const coOwner = await ownershipService.getCoOwnerByUserId(userId);
      if (!coOwner) {
        throw new Error("Tài khoản chưa được đăng ký làm co-owner. Vui lòng hoàn thành KYC trước.");
      }
      
      // Lấy tất cả quyền sở hữu của co-owner (chỉ active)
      const allOwnerships = await ownershipService.getOwnerships(undefined, coOwner.id, true);
      
      // Lấy danh sách group IDs từ ownerships
      const groupIds = [...new Set(allOwnerships.map(o => o.vehicleGroupId))];
      
      // Lấy tất cả groups và lọc chỉ những groups mà co-owner có quyền
      const allGroups = await ownershipService.getGroups();
      const userGroups = allGroups.filter(g => groupIds.includes(g.id));
      
      setGroups(userGroups);
      if (userGroups.length > 0) {
        setSelectedGroupId(userGroups[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải nhóm xe");
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
      console.error("Không thể tải chia sẻ chi phí:", err);
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
      console.error("Không thể tải quỹ nhóm:", err);
    }
  };

  const loadFundTransactions = async (fundId: string) => {
    try {
      const transactions = await ownershipService.getFundTransactions(fundId);
      setFundTransactions(transactions);
    } catch (err) {
      console.error("Không thể tải giao dịch quỹ:", err);
    }
  };

  const handleCreateTransaction = () => {
    if (!selectedFundId) {
      setError("Vui lòng chọn quỹ trước");
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
        setError("Vui lòng điền đầy đủ các trường bắt buộc");
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
      setError(err instanceof Error ? err.message : "Không thể tạo giao dịch");
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

  /**
   * Lấy nhãn loại chi phí (tiếng Việt)
   * @param type - Loại chi phí
   * @returns Nhãn loại chi phí
   */
  const getCostTypeLabel = (type: CostType) => {
    switch (type) {
      case CostType.Maintenance:
        return "Bảo dưỡng";
      case CostType.Insurance:
        return "Bảo hiểm";
      case CostType.Charging:
        return "Sạc điện";
      case CostType.Registration:
        return "Đăng ký";
      case CostType.Cleaning:
        return "Vệ sinh";
      case CostType.Parking:
        return "Đỗ xe";
      case CostType.Toll:
        return "Phí cầu đường";
      case CostType.Other:
        return "Quỹ dự trữ";
      default:
        return "Khác";
    }
  };

  return (
    <>
      <PageMeta title="Đồng sở hữu | Quỹ Chung" />
      <PageHeader
        title="Quản Lý Quỹ Chung"
        description="Xem và quản lý quỹ bảo dưỡng, quỹ dự trữ và lịch sử quỹ minh bạch cho nhóm xe của bạn."
        actions={
          selectedGroupId && groupFunds.length > 0 ? (
            <Button size="sm" onClick={handleCreateTransaction}>
              Thêm Giao Dịch
            </Button>
          ) : null
        }
      />

      {/* Group Selector */}
      {groups.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chọn Nhóm Xe
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
          <p className="text-gray-600 dark:text-gray-400">Đang tải thông tin quỹ...</p>
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
              <p className="text-sm text-blue-600 dark:text-blue-300">Quỹ Bảo Dưỡng</p>
              <p className="mt-1 text-2xl font-semibold text-blue-700 dark:text-blue-200">
                {formatAmount(fundSummary.maintenanceFund)}
              </p>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 shadow-theme-xs dark:border-purple-500/40 dark:bg-purple-500/10">
              <p className="text-sm text-purple-600 dark:text-purple-300">Quỹ Dự Trữ</p>
              <p className="mt-1 text-2xl font-semibold text-purple-700 dark:text-purple-200">
                {formatAmount(fundSummary.reserveFund)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-theme-xs dark:border-emerald-500/40 dark:bg-emerald-500/10">
              <p className="text-sm text-emerald-600 dark:text-emerald-300">Tổng Đóng Góp</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-200">
                {formatAmount(fundSummary.totalContributions)}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-theme-xs dark:border-amber-500/40 dark:bg-amber-500/10">
              <p className="text-sm text-amber-600 dark:text-amber-300">Số Dư</p>
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
                  Quỹ Nhóm
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Chọn một quỹ để xem giao dịch
                </p>
              </div>
              <div className="p-4">
                <Select
                  value={selectedFundId}
                  onChange={(value) => setSelectedFundId(value)}
                >
                  <option value="">Chọn quỹ</option>
                  {groupFunds.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {fund.name} - Số dư: {formatAmount(fund.balance)}
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
                      Giao Dịch Quỹ
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Đóng góp và chi phí cho quỹ đã chọn
                    </p>
                  </div>
                  <Button size="sm" onClick={handleCreateTransaction}>
                    Thêm Giao Dịch
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {fundTransactions.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Không tìm thấy giao dịch nào.
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
                                Chờ Phê Duyệt
                              </span>
                            )}
                          </div>
                          {transaction.category && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Danh mục: {transaction.category}
                            </p>
                          )}
                          {transaction.receiptNumber && (
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              Hóa đơn: {transaction.receiptNumber}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(transaction.transactionDate || transaction.createdAt)} • Bởi: {transaction.coOwnerName || transaction.coOwnerId.substring(0, 8)}
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
                                  setError(err instanceof Error ? err.message : "Không thể phê duyệt");
                                }
                              }}
                              className="mt-2"
                            >
                              Phê Duyệt
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
                Lịch Sử Chia Sẻ Chi Phí
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Lịch sử minh bạch của tất cả đóng góp và chi phí
              </p>
            </div>

            <div className="p-4">
              {costShares.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Không tìm thấy giao dịch quỹ nào.
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
                          {costShare.description || "Không có mô tả"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(costShare.createdAt)} • Hạn: {formatDate(costShare.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
                          {formatAmount(costShare.totalAmount)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {costShare.status === 2 ? "Đã Thanh Toán" : "Chờ Thanh Toán"}
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
              Thêm Giao Dịch Quỹ
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Ghi lại một đóng góp hoặc chi phí cho quỹ nhóm.
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
              <Label>Quỹ <span className="text-error-500">*</span></Label>
              <Select
                value={transactionFormData.fundId}
                onChange={(value) => setTransactionFormData({ ...transactionFormData, fundId: value })}
                required
              >
                <option value="">Chọn quỹ</option>
                {groupFunds.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.name} - Số dư: {formatAmount(fund.balance)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Loại Giao Dịch <span className="text-error-500">*</span></Label>
              <Select
                value={transactionFormData.type}
                onChange={(value) => setTransactionFormData({ ...transactionFormData, type: value })}
                required
              >
                <option value="Contribution">Đóng Góp</option>
                <option value="Expense">Chi Phí</option>
              </Select>
            </div>

            <div>
              <Label>Số Tiền <span className="text-error-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={transactionFormData.amount === 0 ? "" : transactionFormData.amount}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="Nhập số tiền"
                required
              />
            </div>

            <div>
              <Label>Mô Tả</Label>
              <Input
                type="text"
                value={transactionFormData.description}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                placeholder="Nhập mô tả"
              />
            </div>

            <div>
              <Label>Danh Mục</Label>
              <Input
                type="text"
                value={transactionFormData.category}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, category: e.target.value })}
                placeholder="Ví dụ: Bảo dưỡng, Bảo hiểm, v.v."
              />
            </div>

            <div>
              <Label>Số Hóa Đơn</Label>
              <Input
                type="text"
                value={transactionFormData.receiptNumber}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, receiptNumber: e.target.value })}
                placeholder="Nhập số hóa đơn (nếu có)"
              />
            </div>

            <div>
              <Label>Ngày Giao Dịch</Label>
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
                Hủy
              </Button>
              <Button size="sm" type="submit">
                Tạo Giao Dịch
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};

export default CommonFund;

