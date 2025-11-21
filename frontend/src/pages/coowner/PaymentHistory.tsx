import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import { paymentService, Payment, PaymentStatus } from "../../services/paymentService";
import PaymentDetailModal from "../../components/modals/PaymentDetailModal";

const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        setLoading(true);
        const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
        if (!userId) {
          setError("User ID not found. Please login again.");
          return;
        }
        const data = await paymentService.getPayments(userId);
        setPayments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payments");
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, []);

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailModalOpen(true);
  };

  const handleRefresh = async () => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) return;
    try {
      const data = await paymentService.getPayments(userId);
      setPayments(data);
    } catch (err) {
      console.error("Failed to refresh payments:", err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
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

  return (
    <>
      <PageMeta title="Co-owner | Payment History" />
      <PageHeader
        title="Payment History"
        description="Review your contributions and settlement status across every shared expense."
      />
      
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading payments...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          {payments.length === 0 ? (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              No payments found.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/30">
                <tr className="text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white/90">
                      {payment.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white/90">
                      {formatAmount(payment.amount)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {payment.method === 2 ? "Banking" : payment.method === 3 ? "E-Wallet" : "Cash"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(payment.status)}`}
                      >
                        {getStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleViewDetails(payment)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                        >
                          View Details
                        </button>
                        {payment.status === PaymentStatus.Completed && (
                          <button
                            onClick={() => {
                              // Generate and download receipt
                              const receiptHTML = `
                                <!DOCTYPE html>
                                <html>
                                  <head>
                                    <meta charset="UTF-8">
                                    <title>Payment Receipt - ${payment.id.substring(0, 8)}</title>
                                    <style>
                                      body {
                                        font-family: Arial, sans-serif;
                                        max-width: 800px;
                                        margin: 0 auto;
                                        padding: 20px;
                                        color: #333;
                                      }
                                      .header {
                                        text-align: center;
                                        border-bottom: 2px solid #333;
                                        padding-bottom: 20px;
                                        margin-bottom: 30px;
                                      }
                                      .header h1 {
                                        margin: 0;
                                        font-size: 28px;
                                      }
                                      .info-row {
                                        display: flex;
                                        justify-content: space-between;
                                        padding: 10px 0;
                                        border-bottom: 1px solid #eee;
                                      }
                                      .info-label {
                                        font-weight: bold;
                                        color: #666;
                                      }
                                      .amount {
                                        font-size: 24px;
                                        font-weight: bold;
                                        color: #059669;
                                        text-align: right;
                                        margin-top: 20px;
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <h1>PAYMENT RECEIPT</h1>
                                      <p>EV Co-ownership & Cost-sharing System</p>
                                      <p>Receipt Date: ${formatDate(payment.createdAt)}</p>
                                    </div>
                                    <div class="info-row">
                                      <span class="info-label">Payment ID:</span>
                                      <span>${payment.id}</span>
                                    </div>
                                    <div class="info-row">
                                      <span class="info-label">Amount:</span>
                                      <span>${formatAmount(payment.amount)} ${payment.currency}</span>
                                    </div>
                                    <div class="info-row">
                                      <span class="info-label">Method:</span>
                                      <span>${payment.method === 2 ? "Banking" : payment.method === 3 ? "E-Wallet" : "Cash"}</span>
                                    </div>
                                    <div class="info-row">
                                      <span class="info-label">Status:</span>
                                      <span>${getStatusLabel(payment.status)}</span>
                                    </div>
                                    <div class="amount">
                                      Total: ${formatAmount(payment.amount)} ${payment.currency}
                                    </div>
                                  </body>
                                </html>
                              `;
                              const blob = new Blob([receiptHTML], { type: "text/html" });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `receipt-${payment.id.substring(0, 8)}.html`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                            }}
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-medium"
                            title="Download Receipt"
                          >
                            📥 Receipt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedPayment && (
        <PaymentDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          onRefresh={handleRefresh}
        />
      )}
    </>
  );
};

export default PaymentHistory;
