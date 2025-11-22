import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import {
  paymentService,
  Transaction,
  TransactionType,
} from "../../services/paymentService";
import Select from "../../components/form/Select";
import Label from "../../components/form/Label";

/**
 * Trang lịch sử giao dịch - hiển thị tất cả các giao dịch thanh toán, hoàn tiền, chuyển khoản
 * Đã gộp với PaymentHistory (lịch sử thanh toán)
 */
const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterType, setFilterType] = useState<string>("all");
  const [walletId, setWalletId] = useState<string | null>(null);

  /**
   * Tải userId từ localStorage khi component mount
   */
  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (userId) {
      // Sử dụng userId để lấy transactions (backend sẽ tự động tìm wallets)
      setWalletId(userId);
      loadTransactions(userId);
    } else {
      setError("Không tìm thấy User ID. Vui lòng đăng nhập lại.");
      setLoading(false);
    }
  }, []);

  /**
   * Tải lại transactions khi page, filterType, hoặc walletId thay đổi
   */
  useEffect(() => {
    if (walletId) {
      loadTransactions(walletId);
    }
  }, [page, filterType, walletId]);

  /**
   * Tải danh sách giao dịch từ API
   * @param id - User ID hoặc Wallet ID
   */
  const loadTransactions = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await paymentService.getTransactions(id, page, pageSize);
      
      // Lọc theo loại giao dịch nếu cần
      let filteredData = data;
      if (filterType !== "all") {
        filteredData = data.filter(
          (t) => t.type.toString() === filterType
        );
      }
      
      setTransactions(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải lịch sử giao dịch");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Định dạng ngày giờ theo định dạng Việt Nam
   * @param dateString - Chuỗi ngày giờ
   * @returns Ngày giờ đã định dạng (dd/mm/yyyy, hh:mm)
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Định dạng số tiền theo định dạng tiền tệ Việt Nam
   * @param amount - Số tiền
   * @param currency - Loại tiền tệ (mặc định: VND)
   * @returns Số tiền đã định dạng
   */
  const formatAmount = (amount: number, currency: string = "VND") => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  /**
   * Lấy nhãn loại giao dịch (tiếng Việt)
   * @param type - Loại giao dịch
   * @returns Nhãn loại giao dịch
   */
  const getTransactionTypeLabel = (type: TransactionType) => {
    switch (type) {
      case TransactionType.Payment:
        return "Thanh toán";
      case TransactionType.Refund:
        return "Hoàn tiền";
      case TransactionType.Transfer:
        return "Chuyển khoản";
      case TransactionType.Deposit:
        return "Nạp tiền";
      case TransactionType.Withdrawal:
        return "Rút tiền";
      default:
        return "Khác";
    }
  };

  /**
   * Lấy màu hiển thị cho loại giao dịch
   * @param type - Loại giao dịch
   * @returns CSS classes cho màu
   */
  const getTransactionTypeColor = (type: TransactionType) => {
    switch (type) {
      case TransactionType.Payment:
      case TransactionType.Withdrawal:
        return "bg-error-100 text-error-800 dark:bg-error-500/20 dark:text-error-200";
      case TransactionType.Refund:
      case TransactionType.Deposit:
        return "bg-success-100 text-success-800 dark:bg-success-500/20 dark:text-success-200";
      case TransactionType.Transfer:
        return "bg-primary-100 text-primary-800 dark:bg-primary-500/20 dark:text-primary-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  /**
   * Lấy nhãn trạng thái giao dịch (tiếng Việt)
   * @param status - Trạng thái giao dịch (0=Pending, 1=Processing, 2=Completed, 3=Failed, 4=Cancelled)
   * @returns Nhãn trạng thái
   */
  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0:
        return "Chờ xử lý";
      case 1:
        return "Đang xử lý";
      case 2:
        return "Hoàn thành";
      case 3:
        return "Thất bại";
      case 4:
        return "Đã hủy";
      default:
        return "Không xác định";
    }
  };

  /**
   * Lấy màu hiển thị cho trạng thái giao dịch
   * @param status - Trạng thái giao dịch
   * @returns CSS classes cho màu
   */
  const getStatusColor = (status: number) => {
    switch (status) {
      case 2: // Completed
        return "bg-success-100 text-success-800 dark:bg-success-500/20 dark:text-success-200";
      case 3: // Failed
      case 4: // Cancelled
        return "bg-error-100 text-error-800 dark:bg-error-500/20 dark:text-error-200";
      case 1: // Processing
        return "bg-warning-100 text-warning-800 dark:bg-warning-500/20 dark:text-warning-200";
      default: // Pending
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <>
      <PageMeta title="Đồng sở hữu | Lịch Sử Giao Dịch" />
      <PageHeader
        title="Lịch Sử Giao Dịch"
        description="Xem tất cả các giao dịch thanh toán, hoàn tiền, chuyển khoản của bạn"
        actions={
          <Button size="sm" onClick={() => walletId && loadTransactions(walletId)} disabled={loading}>
            Làm mới
          </Button>
        }
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải lịch sử giao dịch...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Filter */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="filterType">Loại giao dịch</Label>
                <Select
                  value={filterType}
                  onChange={(value) => {
                    setFilterType(value);
                    setPage(1);
                  }}
                >
                  <option value="all">Tất cả</option>
                  <option value={TransactionType.Payment.toString()}>Thanh toán</option>
                  <option value={TransactionType.Refund.toString()}>Hoàn tiền</option>
                  <option value={TransactionType.Transfer.toString()}>Chuyển khoản</option>
                  <option value={TransactionType.Deposit.toString()}>Nạp tiền</option>
                  <option value={TransactionType.Withdrawal.toString()}>Rút tiền</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            {transactions.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Không có giao dịch nào.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                        Ngày giờ
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                        Loại
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                        Mô tả
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        Số tiền
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getTransactionTypeColor(
                              transaction.type
                            )}`}
                          >
                            {getTransactionTypeLabel(transaction.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {transaction.description || transaction.reference || "Không có"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                          {formatAmount(transaction.amount, transaction.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                              transaction.status
                            )}`}
                          >
                            {getStatusLabel(transaction.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {transactions.length > 0 && (
              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Trang {page}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Trước
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={transactions.length < pageSize}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default TransactionHistory;

