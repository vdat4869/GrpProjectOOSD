import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import LineChartOne from "../../components/charts/line/LineChartOne";
import Button from "../../components/ui/button/Button";
import {
  paymentService,
  CostShare,
  CostShareDetail,
  PaymentStatus,
} from "../../services/paymentService";
import { bookingService } from "../../services/bookingService";
import { ownershipService } from "../../services/ownershipService";
import CreatePaymentModal from "../../components/modals/CreatePaymentModal";

const CoownerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const firstName =
    typeof window !== "undefined" ? localStorage.getItem("firstName") : null;
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const [pendingPayments, setPendingPayments] = useState<CostShareDetail[]>([]);
  const [costSharesMap, setCostSharesMap] = useState<Map<string, CostShare>>(new Map());
  const [totalBalanceDue, setTotalBalanceDue] = useState(0);
  const [upcomingTrips, setUpcomingTrips] = useState(0);
  const [sharedVehicles, setSharedVehicles] = useState(0);
  const [votingItems, setVotingItems] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCostShareDetailId, setSelectedCostShareDetailId] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {

      // Load cost shares and find pending payments for current user
      const costShares = await paymentService.getCostShares();
      const costSharesMap = new Map<string, CostShare>();
      const allPendingDetails: CostShareDetail[] = [];

      for (const costShare of costShares) {
        costSharesMap.set(costShare.id, costShare);
        try {
          const details = await paymentService.getCostShareDetails(costShare.id);
          // Filter for current user's pending payments
          const userPendingDetails = details.filter(
            (detail) =>
              detail.userId === userId && detail.status === PaymentStatus.Pending
          );
          allPendingDetails.push(...userPendingDetails);
        } catch (err) {
          console.error(`Failed to load details for cost share ${costShare.id}:`, err);
        }
      }

      setCostSharesMap(costSharesMap);
      setPendingPayments(allPendingDetails);
      const total = allPendingDetails.reduce((sum, detail) => sum + detail.amount, 0);
      setTotalBalanceDue(total);

      // Load bookings for upcoming trips
      try {
        const bookings = await bookingService.getBookings();
        const now = new Date();
        const upcoming = bookings.filter(
          (b) =>
            new Date(b.startTime) > now &&
            (b.status.toLowerCase() === "confirmed" || b.status.toLowerCase() === "pending")
        );
        setUpcomingTrips(upcoming.length);
      } catch (err) {
        console.error("Failed to load bookings:", err);
      }

      // Load vehicle groups
      try {
        const groups = await ownershipService.getGroups();
        setSharedVehicles(groups.length);
      } catch (err) {
        console.error("Failed to load groups:", err);
      }

      // TODO: Load voting items when voting service is available
      setVotingItems(0);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
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
    loadDashboardData();
  };

  const formatAmount = (amount: number) => {
    return `₫${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <PageMeta title="Co-owner | Dashboard" />
      <PageHeader
        title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
        description="Track your bookings, payments, and usage trends across every shared EV you co-own."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Upcoming Trips"
          value={upcomingTrips}
          trend={upcomingTrips > 0 ? "Next 7 days" : "No upcoming trips"}
        />
        <StatCard
          label="Shared Vehicles"
          value={sharedVehicles}
          trend={sharedVehicles > 0 ? "Active" : "No vehicles"}
        />
        <StatCard
          label="Balance Due"
          value={formatAmount(totalBalanceDue)}
          trend={totalBalanceDue > 0 ? `${pendingPayments.length} pending` : "Paid in full"}
        />
        <StatCard label="Voting Items" value={votingItems} trend={votingItems > 0 ? "New" : "None"} />
      </div>

      {/* Pending Payments Section */}
      {pendingPayments.length > 0 && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-theme-xs dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Pending Payments
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                You have {pendingPayments.length} payment{pendingPayments.length > 1 ? "s" : ""} waiting
                for payment
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("/coowner/cost-shares")}
              variant="outline"
            >
              View All
            </Button>
          </div>

          <div className="space-y-3">
            {pendingPayments.slice(0, 3).map((detail) => {
              const costShare = costSharesMap.get(detail.costShareId);
              const costShareTitle = costShare?.title || "Cost Share";
              const dueDate = costShare?.dueDate ? formatDate(costShare.dueDate) : "";

              return (
                <div
                  key={detail.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-500/40 dark:bg-gray-900"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white/90">
                      {costShareTitle}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Amount: {formatAmount(detail.amount)} • Ownership: {detail.ownershipPercentage}%
                      {dueDate && ` • Due: ${dueDate}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePay(detail.id, detail.amount)}
                    className="ml-4"
                  >
                    Pay Now
                  </Button>
                </div>
              );
            })}
          </div>

          {pendingPayments.length > 3 && (
            <div className="mt-4 text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/coowner/cost-shares")}
              >
                View {pendingPayments.length - 3} more payment{pendingPayments.length - 3 > 1 ? "s" : ""}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            Personal Usage Trend
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review how often you have booked compared to the group average over the past 12 months.
          </p>
        </div>
        <LineChartOne />
      </div>

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

export default CoownerDashboard;
