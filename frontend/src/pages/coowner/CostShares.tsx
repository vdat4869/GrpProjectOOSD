import { useEffect, useState } from "react";
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

const CostShares: React.FC = () => {
  const [costShares, setCostShares] = useState<CostShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCostShareDetailId, setSelectedCostShareDetailId] = useState<
    string | null
  >(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);

  useEffect(() => {
    loadCostShares();
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
                        {costShare.costShareDetails.map((detail) => (
                          <div
                            key={detail.id}
                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/30"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                                User: {detail.userId.substring(0, 8)}...
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
                              {detail.status === PaymentStatus.Pending && (
                                <button
                                  onClick={() => handlePay(detail.id, detail.amount)}
                                  className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
                                >
                                  Pay Now
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
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

