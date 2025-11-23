import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { paymentService, CostShare, CostShareDetail, PaymentStatus } from "../../services/paymentService";
import { authService, UserSummary } from "../../services/authService";

// Props cho modal xem chi tiết cost share
interface ViewCostShareDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  costShare: CostShare | null;
}

// Modal để xem chi tiết cost share
export default function ViewCostShareDetailsModal({
  isOpen,
  onClose,
  costShare,
}: ViewCostShareDetailsModalProps) {
  const [details, setDetails] = useState<CostShareDetail[]>([]);
  const [users, setUsers] = useState<Map<string, UserSummary>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && costShare) {
      loadDetails();
    } else {
      setDetails([]);
      setUsers(new Map());
      setError(null);
    }
  }, [isOpen, costShare]);

  // Tải chi tiết cost share
  const loadDetails = async () => {
    if (!costShare) return;

    try {
      setLoading(true);
      setError(null);
      const detailsData = await paymentService.getCostShareDetails(costShare.id);
      setDetails(detailsData);

      // Tải thông tin người dùng cho mỗi chi tiết
      const userMap = new Map<string, UserSummary>();
      for (const detail of detailsData) {
        try {
          // Thử parse userId thành number trước (nếu là chuỗi số)
          const userIdNum = parseInt(detail.userId);
          if (!isNaN(userIdNum)) {
            const user = await authService.getUserDetails(userIdNum);
            userMap.set(detail.userId, user);
          }
        } catch (err) {
          // Nếu userId là GUID, không thể lấy thông tin người dùng dễ dàng
          // Bỏ qua tạm thời
          console.warn(`Could not load user details for ${detail.userId}`);
        }
      }
      setUsers(userMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải chi tiết cost share");
    } finally {
      setLoading(false);
    }
  };

  // Đánh dấu đã thanh toán
  const handleMarkAsPaid = async (detailId: string) => {
    try {
      const success = await paymentService.markCostShareDetailAsPaid(detailId);
      if (success) {
        await loadDetails();
        // Tải lại parent nếu cần
        if (costShare) {
          const updated = await paymentService.getCostShareById(costShare.id);
          if (updated) {
            // Kích hoạt reload parent
            window.dispatchEvent(new CustomEvent("costShareUpdated"));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đánh dấu đã thanh toán");
    }
  };

  const getUserName = (userId: string): string => {
    const user = users.get(userId);
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return userId.substring(0, 8) + "...";
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

  // Lấy nhãn trạng thái thanh toán
  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.Pending:
        return "Chờ thanh toán";
      case PaymentStatus.Processing:
        return "Đang xử lý";
      case PaymentStatus.Completed:
        return "Đã hoàn thành";
      case PaymentStatus.Failed:
        return "Thất bại";
      case PaymentStatus.Cancelled:
        return "Đã hủy";
      case PaymentStatus.Refunded:
        return "Đã hoàn tiền";
      default:
        return "Không xác định";
    }
  };

  const formatAmount = (amount: number) => {
    return `₫${amount.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!costShare) return null;

  const totalAmount = details.reduce((sum, d) => sum + d.amount, 0);
  const paidAmount = details
    .filter((d) => d.status === PaymentStatus.Completed)
    .reduce((sum, d) => sum + d.amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[800px] m-4">
      <div className="no-scrollbar relative w-full max-w-[800px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Chi Tiết Cost Share
          </h4>
        </div>
        <div className="px-2 space-y-4">
        {/* Tóm tắt Cost Share */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">{costShare.title}</h3>
          {costShare.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{costShare.description}</p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tổng Số Tiền</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white/90">
                {formatAmount(costShare.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Đã Thanh Toán</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatAmount(paidAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Chờ Thanh Toán</p>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {formatAmount(pendingAmount)}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-500/40 dark:bg-error-500/10">
            <p className="text-sm text-error-600 dark:text-error-200">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-gray-600 dark:text-gray-400">Đang tải chi tiết...</div>
        ) : details.length === 0 ? (
          <div className="py-8 text-center text-gray-600 dark:text-gray-400">Không tìm thấy chi tiết.</div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white/90">Phân Bổ Thanh Toán</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Đồng sở hữu
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      % Sở hữu
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Số Tiền
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Trạng Thái
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Ngày Thanh Toán
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Hành Động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900">
                  {details.map((detail) => (
                    <tr key={detail.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                        {getUserName(detail.userId)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {detail.ownershipPercentage.toFixed(1)}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {formatAmount(detail.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                            detail.status
                          )}`}
                        >
                          {getStatusLabel(detail.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {formatDate(detail.paidDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {detail.status === PaymentStatus.Pending && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleMarkAsPaid(detail.id)}
                          >
                            Đánh Dấu Đã Thanh Toán
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button size="sm" variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
        </div>
      </div>
    </Modal>
  );
}

