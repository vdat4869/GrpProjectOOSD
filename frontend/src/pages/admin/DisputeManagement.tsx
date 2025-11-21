import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService } from "../../services/bookingService";
import { paymentService, PaymentStatus } from "../../services/paymentService";
import { ownershipService } from "../../services/ownershipService";

interface PotentialDispute {
  id: string;
  type: "booking_conflict" | "payment_issue" | "cancellation" | "refund" | "overdue_payment";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  relatedId: number | string;
  relatedType: "booking" | "payment" | "cost_share";
  createdAt: string;
  status: "pending" | "in_review" | "resolved";
}

const DisputeManagement: React.FC = () => {
  const [disputes, setDisputes] = useState<PotentialDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "in_review" | "resolved">("all");

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError(null);

      const [bookings, vehicleGroups] = await Promise.all([
        bookingService.getBookings(),
        ownershipService.getGroups(),
      ]);

      const costSharesPromises = vehicleGroups.map((group) =>
        paymentService.getCostShares(group.id).catch(() => [])
      );
      const costSharesArrays = await Promise.all(costSharesPromises);
      const allCostShares = costSharesArrays.flat();

      const potentialDisputes: PotentialDispute[] = [];

      // Check for cancelled bookings
      const cancelledBookings = bookings.filter((b) => b.status.toLowerCase() === "cancelled");
      cancelledBookings.forEach((booking) => {
        potentialDisputes.push({
          id: `booking-${booking.id}`,
          type: "cancellation",
          title: `Booking #${booking.id} Cancelled`,
          description: `Booking for vehicle #${booking.vehicleId} was cancelled.`,
          severity: "medium",
          relatedId: booking.id,
          relatedType: "booking",
          createdAt: booking.createdAt || new Date().toISOString(),
          status: "pending",
        });
      });

      // Check for overlapping bookings
      for (let i = 0; i < bookings.length; i++) {
        for (let j = i + 1; j < bookings.length; j++) {
          const b1 = bookings[i];
          const b2 = bookings[j];
          if (
            b1.vehicleId === b2.vehicleId &&
            b1.status.toLowerCase() !== "cancelled" &&
            b2.status.toLowerCase() !== "cancelled"
          ) {
            const start1 = new Date(b1.startTime);
            const end1 = new Date(b1.endTime);
            const start2 = new Date(b2.startTime);
            const end2 = new Date(b2.endTime);
            if (start1 < end2 && start2 < end1) {
              potentialDisputes.push({
                id: `conflict-${b1.id}-${b2.id}`,
                type: "booking_conflict",
                title: `Booking Conflict: #${b1.id} & #${b2.id}`,
                description: `Overlapping bookings for vehicle #${b1.vehicleId}.`,
                severity: "high",
                relatedId: b1.id,
                relatedType: "booking",
                createdAt: b1.createdAt || new Date().toISOString(),
                status: "pending",
              });
            }
          }
        }
      }

      // Check for overdue payments
      allCostShares.forEach((cs) => {
        const dueDate = new Date(cs.dueDate);
        const now = new Date();
        if (cs.status === PaymentStatus.Pending && now > dueDate) {
          potentialDisputes.push({
            id: `overdue-${cs.id}`,
            type: "overdue_payment",
            title: `Overdue Payment: ${cs.title}`,
            description: `Cost share for ${cs.vehicleId} is overdue.`,
            severity: "high",
            relatedId: cs.id,
            relatedType: "cost_share",
            createdAt: cs.createdAt,
            status: "pending",
          });
        }
      });

      setDisputes(potentialDisputes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300";
      case "medium":
        return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
      default:
        return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "booking_conflict":
        return "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300";
      case "overdue_payment":
        return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300";
      case "cancellation":
        return "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300";
      default:
        return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <PageMeta title="Admin | Dispute Management" />
      <PageHeader
        title="Dispute Management"
        description="Oversee escalations between co-owners, ensure SLAs are met, and document outcomes across services."
        actions={<Button size="sm" onClick={loadDisputes} disabled={loading}>Refresh</Button>}
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading disputes...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={filter === "all" ? "primary" : "outline"}
              onClick={() => setFilter("all")}
            >
              All ({disputes.length})
            </Button>
            <Button
              size="sm"
              variant={filter === "pending" ? "primary" : "outline"}
              onClick={() => setFilter("pending")}
            >
              Pending ({disputes.filter((d) => d.status === "pending").length})
            </Button>
            <Button
              size="sm"
              variant={filter === "in_review" ? "primary" : "outline"}
              onClick={() => setFilter("in_review")}
            >
              In Review ({disputes.filter((d) => d.status === "in_review").length})
            </Button>
            <Button
              size="sm"
              variant={filter === "resolved" ? "primary" : "outline"}
              onClick={() => setFilter("resolved")}
            >
              Resolved ({disputes.filter((d) => d.status === "resolved").length})
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredDisputes.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                <p className="text-gray-600 dark:text-gray-400">No disputes found.</p>
              </div>
            ) : (
              filteredDisputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                            {dispute.title}
                          </h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getTypeColor(dispute.type)}`}>
                            {dispute.type.replace("_", " ")}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityColor(dispute.severity)}`}>
                            {dispute.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {dispute.description}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Created: {formatDate(dispute.createdAt)} • Related: {dispute.relatedType} #{dispute.relatedId}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
};

export default DisputeManagement;
