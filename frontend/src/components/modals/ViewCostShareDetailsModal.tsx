import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { paymentService, CostShare, CostShareDetail, PaymentStatus } from "../../services/paymentService";
import { authService, UserSummary } from "../../services/authService";

interface ViewCostShareDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  costShare: CostShare | null;
}

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

  const loadDetails = async () => {
    if (!costShare) return;

    try {
      setLoading(true);
      setError(null);
      const detailsData = await paymentService.getCostShareDetails(costShare.id);
      setDetails(detailsData);

      // Load user info for each detail
      const userMap = new Map<string, UserSummary>();
      for (const detail of detailsData) {
        try {
          // Try to parse userId as number first (if it's a number string)
          const userIdNum = parseInt(detail.userId);
          if (!isNaN(userIdNum)) {
            const user = await authService.getUserDetails(userIdNum);
            userMap.set(detail.userId, user);
          }
        } catch (err) {
          // If userId is GUID, we can't get user details easily
          // Just skip for now
          console.warn(`Could not load user details for ${detail.userId}`);
        }
      }
      setUsers(userMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cost share details");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (detailId: string) => {
    try {
      const success = await paymentService.markCostShareDetailAsPaid(detailId);
      if (success) {
        await loadDetails();
        // Also reload parent if needed
        if (costShare) {
          const updated = await paymentService.getCostShareById(costShare.id);
          if (updated) {
            // Trigger parent reload
            window.dispatchEvent(new CustomEvent("costShareUpdated"));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
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
            Cost Share Details
          </h4>
        </div>
        <div className="px-2 space-y-4">
        {/* Cost Share Summary */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">{costShare.title}</h3>
          {costShare.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{costShare.description}</p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white/90">
                {formatAmount(costShare.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatAmount(paidAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
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
          <div className="py-8 text-center text-gray-600 dark:text-gray-400">Loading details...</div>
        ) : details.length === 0 ? (
          <div className="py-8 text-center text-gray-600 dark:text-gray-400">No details found.</div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white/90">Payment Breakdown</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Co-owner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Ownership %
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Paid Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Actions
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
                            Mark Paid
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
            Close
          </Button>
        </div>
        </div>
      </div>
    </Modal>
  );
}

