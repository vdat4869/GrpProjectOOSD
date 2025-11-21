import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import {
  paymentService,
  CostShare,
  CostType,
  PaymentStatus,
} from "../../services/paymentService";
import CreateCostShareModal from "../../components/modals/CreateCostShareModal";
import CreatePaymentModal from "../../components/modals/CreatePaymentModal";
import PaymentTypeModal from "../../components/modals/PaymentTypeModal";

const CostShares: React.FC = () => {
  const navigate = useNavigate();
  const [costShares, setCostShares] = useState<CostShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showPaymentTypeModal, setShowPaymentTypeModal] = useState(false);
  const [selectedCostShareDetailId, setSelectedCostShareDetailId] = useState<
    string | null
  >(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalPendingAmount, setTotalPendingAmount] = useState(0);
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    loadCostShares();
    // Show payment type modal on first visit
    const hasSeenModal = sessionStorage.getItem("payment-type-selected");
    if (!hasSeenModal) {
      setShowPaymentTypeModal(true);
    }
  }, []);

  const loadCostShares = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await paymentService.getCostShares();
      
      // Load details for each cost share
      const costSharesWithDetails = await Promise.all(
        data.map(async (costShare) => {
          try {
            const details = await paymentService.getCostShareDetails(costShare.id);
            return { ...costShare, costShareDetails: details };
          } catch (err) {
            console.error(`Failed to load details for cost share ${costShare.id}:`, err);
            return costShare;
          }
        })
      );
      
      setCostShares(costSharesWithDetails);

      // Calculate pending payments for current user
      let pending = 0;
      let totalPending = 0;
      costSharesWithDetails.forEach((costShare) => {
        if (costShare.costShareDetails) {
          costShare.costShareDetails.forEach((detail) => {
            if (detail.userId === userId && detail.status === PaymentStatus.Pending) {
              pending++;
              totalPending += detail.amount;
            }
          });
        }
      });
      setPendingCount(pending);
      setTotalPendingAmount(totalPending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cost shares");
    } finally {
      setLoading(false);
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

  const getCostTypeLabel = (type: CostType) => {
    switch (type) {
      case CostType.Charging:
        return "Charging";
      case CostType.Insurance:
        return "Insurance";
      case CostType.Maintenance:
        return "Maintenance";
      case CostType.Registration:
        return "Registration";
      case CostType.Cleaning:
        return "Cleaning";
      case CostType.Parking:
        return "Parking";
      case CostType.Toll:
        return "Toll";
      case CostType.Other:
        return "Other";
      default:
        return "Unknown";
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

  const handlePay = (costShareDetailId: string, amount: number) => {
    setSelectedCostShareDetailId(costShareDetailId);
    setSelectedAmount(amount);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    setSelectedCostShareDetailId(null);
    setSelectedAmount(0);
    loadCostShares();
  };

  return (
    <>
      <PageMeta title="Co-owner | Cost Shares" />
      <PageHeader
        title="Cost Shares"
        description="View and manage shared costs for your vehicle groups."
      />

      {/* Pending Payments Alert */}
      {pendingCount > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-theme-xs dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                You have {pendingCount} pending payment{pendingCount > 1 ? "s" : ""}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Total amount due: <span className="font-semibold">{formatAmount(totalPendingAmount)}</span>
              </p>
            </div>
            <button
              onClick={() => {
                // Scroll to first pending payment
                const firstPending = document.querySelector('[data-pending="true"]');
                if (firstPending) {
                  firstPending.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              View Pending Payments
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
        >
          Create Cost Share
        </button>
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
        <div className="space-y-4">
          {costShares.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">
                No cost shares found.
              </p>
            </div>
          ) : (
            costShares.map((costShare) => (
              <div
                key={costShare.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                        {costShare.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {costShare.description || "No description"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
                        {formatAmount(costShare.totalAmount)}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                          costShare.status
                        )}`}
                      >
                        {getStatusLabel(costShare.status)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>Type: {getCostTypeLabel(costShare.costType)}</span>
                    <span>Due: {formatDate(costShare.dueDate)}</span>
                  </div>
                </div>
                {costShare.costShareDetails &&
                  costShare.costShareDetails.length > 0 && (
                    <div className="p-4">
                      <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Cost Share Details
                      </h4>
                      <div className="space-y-2">
                        {costShare.costShareDetails.map((detail) => {
                          const isUserPending = detail.userId === userId && detail.status === PaymentStatus.Pending;
                          return (
                            <div
                              key={detail.id}
                              data-pending={isUserPending}
                              className={`flex items-center justify-between rounded-lg border p-3 ${
                                isUserPending
                                  ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
                                  : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/30"
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                                  {detail.userId === userId ? (
                                    <span className="font-semibold">You</span>
                                  ) : (
                                    `User: ${detail.userId.substring(0, 8)}...`
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Ownership: {detail.ownershipPercentage}% | Amount:{" "}
                                  {formatAmount(detail.amount)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                                    detail.status
                                  )}`}
                                >
                                  {getStatusLabel(detail.status)}
                                </span>
                                {isUserPending && (
                                  <button
                                    onClick={() => handlePay(detail.id, detail.amount)}
                                    className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 shadow-md hover:shadow-lg transition-all"
                                  >
                                    Pay Now
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            ))
          )}
        </div>
      )}

      <CreateCostShareModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          loadCostShares();
        }}
      />

      <PaymentTypeModal
        isOpen={showPaymentTypeModal}
        onClose={() => {
          setShowPaymentTypeModal(false);
          sessionStorage.setItem("payment-type-selected", "true");
        }}
        onSelectCompany={() => {
          setShowPaymentTypeModal(false);
          navigate("/coowner/company-payment");
          sessionStorage.setItem("payment-type-selected", "true");
        }}
        onSelectPersonal={() => {
          setShowPaymentTypeModal(false);
          sessionStorage.setItem("payment-type-selected", "true");
          // Stay on this page for personal payment
        }}
      />

      {selectedCostShareDetailId && (
        <CreatePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedCostShareDetailId(null);
            setSelectedAmount(0);
          }}
          onSuccess={handlePaymentSuccess}
          costShareDetailId={selectedCostShareDetailId}
          amount={selectedAmount}
        />
      )}
    </>
  );
};

export default CostShares;

