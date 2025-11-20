import { useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { paymentService, Payment, PaymentStatus } from "../../services/paymentService";

interface PaymentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  onRefresh: () => void;
}

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  isOpen,
  onClose,
  payment,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number) => {
    return `₫${amount.toLocaleString()}`;
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
      case PaymentStatus.Refunded:
        return "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300";
      default:
        return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
    }
  };

  const getMethodLabel = (method: number) => {
    switch (method) {
      case 2:
        return "Banking";
      case 3:
        return "E-Wallet";
      case 4:
        return "Cash";
      default:
        return "Unknown";
    }
  };

  const handleCancel = async () => {
    if (
      payment.status !== PaymentStatus.Pending &&
      payment.status !== PaymentStatus.Processing
    ) {
      setError("Only pending or processing payments can be cancelled");
      return;
    }

    if (!confirm("Are you sure you want to cancel this payment?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const result = await paymentService.cancelPayment(payment.id);
      if (result) {
        setSuccess("Payment cancelled successfully");
        setTimeout(() => {
          onRefresh();
          onClose();
        }, 1500);
      } else {
        setError("Failed to cancel payment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel payment");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (payment.status !== PaymentStatus.Completed) {
      setError("Only completed payments can be refunded");
      return;
    }

    if (!confirm("Are you sure you want to refund this payment?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const result = await paymentService.refundPayment(payment.id);
      if (result) {
        setSuccess("Refund request submitted successfully");
        setTimeout(() => {
          onRefresh();
          onClose();
        }, 1500);
      } else {
        setError("Failed to refund payment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refund payment");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentUrl = () => {
    if (payment.paymentUrl) {
      window.open(payment.paymentUrl, "_blank");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] m-4">
      <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Payment Details
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            View payment information and manage payment actions.
          </p>
        </div>

        <div className="px-2 pb-3">
          {error && (
            <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Payment ID
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">
                    {payment.id.substring(0, 8)}...
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                      payment.status
                    )}`}
                  >
                    {getStatusLabel(payment.status)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Amount
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">
                    {formatAmount(payment.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Currency
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">
                    {payment.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Payment Method
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">
                    {getMethodLabel(payment.method)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Created At
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white/90">
                    {formatDate(payment.createdAt)}
                  </p>
                </div>
                {payment.processedAt && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Processed At
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white/90">
                      {formatDate(payment.processedAt)}
                    </p>
                  </div>
                )}
                {payment.transactionId && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Transaction ID
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white/90">
                      {payment.transactionId}
                    </p>
                  </div>
                )}
                {payment.externalTransactionId && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      External Transaction ID
                    </p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white/90">
                      {payment.externalTransactionId}
                    </p>
                  </div>
                )}
                {payment.errorMessage && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-red-500 dark:text-red-400">
                      Error Message
                    </p>
                    <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                      {payment.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {payment.paymentUrl && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={handleOpenPaymentUrl}
                  className="w-full"
                >
                  Open Payment URL
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              {(payment.status === PaymentStatus.Pending ||
                payment.status === PaymentStatus.Processing) && (
                <Button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  {loading ? "Cancelling..." : "Cancel Payment"}
                </Button>
              )}
              {payment.status === PaymentStatus.Completed && (
                <Button
                  type="button"
                  onClick={handleRefund}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  {loading ? "Processing..." : "Request Refund"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentDetailModal;

