import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService } from "../../services/bookingService";
import { paymentService, PaymentStatus } from "../../services/paymentService";
import { ownershipService } from "../../services/ownershipService";
import { disputeService, Dispute as DisputeType, CreateDisputeDto } from "../../services/disputeService";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";

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
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

// Convert Dispute from API to PotentialDispute for compatibility
const convertDisputeToPotential = (dispute: DisputeType): PotentialDispute => ({
  id: dispute.id,
  type: dispute.type as PotentialDispute["type"],
  title: dispute.title,
  description: dispute.description,
  severity: dispute.severity as PotentialDispute["severity"],
  relatedId: dispute.relatedId,
  relatedType: dispute.relatedType as PotentialDispute["relatedType"],
  createdAt: dispute.createdAt,
  status: dispute.status as PotentialDispute["status"],
  notes: dispute.notes,
  resolvedBy: dispute.resolvedBy,
  resolvedAt: dispute.resolvedAt,
});

const DisputeTracking: React.FC = () => {
  const [disputes, setDisputes] = useState<PotentialDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "in_review" | "resolved">("all");
  const [selectedDispute, setSelectedDispute] = useState<PotentialDispute | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, try to load existing disputes from database
      const existingDisputes = await disputeService.getDisputes();
      if (existingDisputes.length > 0) {
        // Convert and set disputes from database
        setDisputes(existingDisputes.map(convertDisputeToPotential));
      }

      // Then, detect new potential disputes and save to database
      await detectAndSaveNewDisputes();

      // Reload from database after saving new ones
      const allDisputes = await disputeService.getDisputes();
      setDisputes(allDisputes.map(convertDisputeToPotential));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  const detectAndSaveNewDisputes = async () => {
    try {
      // Load bookings, cost shares, and vehicle groups
      const [bookings, vehicleGroups] = await Promise.all([
        bookingService.getBookings(),
        ownershipService.getGroups(),
      ]);

      // Load cost shares for each group
      const costSharesPromises = vehicleGroups.map((group) =>
        paymentService.getCostShares(group.id).catch(() => [])
      );
      const costSharesArrays = await Promise.all(costSharesPromises);
      const allCostShares = costSharesArrays.flat();

      const potentialDisputes: CreateDisputeDto[] = [];

      // Check for booking conflicts (overlapping bookings, multiple cancellations)
      const cancelledBookings = bookings.filter((b) => b.status.toLowerCase() === "cancelled");
      cancelledBookings.forEach((booking) => {
        potentialDisputes.push({
          type: "cancellation",
          title: `Booking #${booking.id} Cancelled`,
          description: `Booking for vehicle #${booking.vehicleId} was cancelled. Check for conflicts or issues.`,
          severity: "medium",
          relatedId: booking.id.toString(),
          relatedType: "booking",
        });
      });

      // Check for overlapping bookings (potential conflicts)
      const activeBookings = bookings.filter(
        (b) => b.status.toLowerCase() === "confirmed" || b.status.toLowerCase() === "in-progress"
      );
      for (let i = 0; i < activeBookings.length; i++) {
        for (let j = i + 1; j < activeBookings.length; j++) {
          const b1 = activeBookings[i];
          const b2 = activeBookings[j];
          if (b1.vehicleId === b2.vehicleId) {
            const start1 = new Date(b1.startTime);
            const end1 = new Date(b1.endTime);
            const start2 = new Date(b2.startTime);
            const end2 = new Date(b2.endTime);

            // Check for overlap
            if (start1 <= end2 && start2 <= end1) {
              potentialDisputes.push({
                type: "booking_conflict",
                title: `Booking Conflict: #${b1.id} and #${b2.id}`,
                description: `Two bookings for vehicle #${b1.vehicleId} have overlapping time slots.`,
                severity: "high",
                relatedId: b1.id.toString(),
                relatedType: "booking",
              });
            }
          }
        }
      }

      // Check for bookings with issues (no check-in after scheduled time, long overdue check-out)
      const now = new Date();
      bookings.forEach((booking) => {
        const startTime = new Date(booking.startTime);
        const endTime = new Date(booking.endTime);
        const status = booking.status.toLowerCase();

        // Booking confirmed but past start time without check-in
        if (status === "confirmed" && now > startTime && !booking.checkInTime) {
          const hoursPast = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60 * 60));
          if (hoursPast > 1) {
            potentialDisputes.push({
              type: "booking_conflict",
              title: `No Show: Booking #${booking.id}`,
              description: `Booking for vehicle #${booking.vehicleId} was confirmed but no check-in occurred. ${hoursPast} hours past scheduled time.`,
              severity: "medium",
              relatedId: booking.id.toString(),
              relatedType: "booking",
            });
          }
        }

        // Booking checked-in but past end time without check-out
        if (booking.checkInTime && !booking.checkOutTime && now > endTime) {
          const hoursPast = Math.floor((now.getTime() - endTime.getTime()) / (1000 * 60 * 60));
          if (hoursPast > 2) {
            potentialDisputes.push({
              type: "booking_conflict",
              title: `Overdue Check-out: Booking #${booking.id}`,
              description: `Booking for vehicle #${booking.vehicleId} is overdue by ${hoursPast} hours. Check-out required.`,
              severity: "high",
              relatedId: booking.id.toString(),
              relatedType: "booking",
            });
          }
        }
      });

      // Check for payment issues (overdue cost shares, failed payments)
      allCostShares.forEach((costShare) => {
        const dueDate = new Date(costShare.dueDate);
        const now = new Date();
        const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Overdue cost share
        if (costShare.status === PaymentStatus.Pending && now > dueDate && daysPastDue > 7) {
          potentialDisputes.push({
            type: "overdue_payment",
            title: `Overdue Payment: ${costShare.title}`,
            description: `Cost share for ${costShare.title} is ${daysPastDue} days overdue. Amount: ${costShare.currency} ${costShare.totalAmount.toLocaleString()}`,
            severity: daysPastDue > 30 ? "high" : "medium",
            relatedId: costShare.id.toString(),
            relatedType: "cost_share",
          });
        }

        // Check cost share details for unpaid items
        if (costShare.costShareDetails) {
          costShare.costShareDetails.forEach((detail) => {
            if (detail.status === PaymentStatus.Failed) {
              potentialDisputes.push({
                type: "payment_issue",
                title: `Failed Payment: ${costShare.title}`,
                description: `Payment failed for cost share detail #${detail.id}. Amount: ${detail.currency} ${detail.amount.toLocaleString()}`,
                severity: "high",
                relatedId: detail.id.toString(),
                relatedType: "payment",
              });
            }
          });
        }
      });

      // Bulk save detected disputes to database
      if (potentialDisputes.length > 0) {
        try {
          await disputeService.bulkCreateDisputes(potentialDisputes);
        } catch (err) {
          console.error("Failed to save detected disputes:", err);
        }
      }
    } catch (err) {
      console.error("Failed to detect disputes:", err);
    }
  };

  const handleReview = (dispute: PotentialDispute) => {
    setSelectedDispute(dispute);
    setReviewNotes(dispute.notes || "");
    setShowReviewModal(true);
  };

  const handleResolve = (dispute: PotentialDispute) => {
    setSelectedDispute(dispute);
    setReviewNotes(dispute.notes || "");
    setShowResolveModal(true);
  };

  const saveReview = async () => {
    if (!selectedDispute) return;

    try {
      setError(null);
      // Update dispute in database via API
      await disputeService.updateDispute(selectedDispute.id, {
        status: "in_review",
        notes: reviewNotes,
      });

      // Reload disputes from database
      await loadDisputes();

      setShowReviewModal(false);
      setSelectedDispute(null);
      setReviewNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update dispute");
    }
  };

  const saveResolve = async () => {
    if (!selectedDispute) return;

    try {
      setError(null);
      const userEmail = localStorage.getItem("email") || "Staff";
      
      // Update dispute in database via API
      await disputeService.updateDispute(selectedDispute.id, {
        status: "resolved",
        notes: reviewNotes,
        resolvedBy: userEmail,
      });

      // Reload disputes from database
      await loadDisputes();

      setShowResolveModal(false);
      setSelectedDispute(null);
      setReviewNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve dispute");
    }
  };

  const filteredDisputes = disputes.filter((dispute) => {
    if (filter === "all") return true;
    // Match status regardless of case and format (Pending/pending, InReview/in_review, Resolved/resolved)
    const disputeStatusLower = dispute.status.toLowerCase().replace("_", "");
    const filterLower = filter.toLowerCase().replace("_", "");
    return disputeStatusLower === filterLower;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-300";
      case "medium":
        return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
      case "low":
        return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300";
      default:
        return "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "booking_conflict":
        return "Booking Conflict";
      case "payment_issue":
        return "Payment Issue";
      case "cancellation":
        return "Cancellation";
      case "refund":
        return "Refund";
      case "overdue_payment":
        return "Overdue Payment";
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <PageMeta title="Staff | Dispute Tracking" />
      <PageHeader
        title="Dispute Tracking"
        description="Assist administrators by triaging escalations, logging updates, and keeping co-owners informed."
        actions={
          <Button size="sm" onClick={loadDisputes} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {/* Filters */}
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

      {/* Disputes List */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Loading disputes...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-200">{error}</p>
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
              Triage Checklist
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>• Review evidence from booking and payment services.</li>
              <li>• Collect statements from involved co-owners.</li>
              <li>• Coordinate with admins for final arbitration decisions.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <p className="font-medium text-gray-700 dark:text-gray-200">No Disputes Found</p>
            <p className="mt-2">
              No potential disputes detected. The system is monitoring bookings and payments for issues.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDisputes.map((dispute) => (
            <div
              key={dispute.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      {dispute.title}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getSeverityColor(dispute.severity)}`}>
                      {dispute.severity.toUpperCase()}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {getTypeLabel(dispute.type)}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      dispute.status.toLowerCase().replace("_", "") === "resolved"
                        ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300"
                        : dispute.status.toLowerCase().replace("_", "") === "inreview"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
                    }`}>
                      {dispute.status.replace("_", " ").replace(/([A-Z])/g, " $1").trim().toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{dispute.description}</p>
                  {dispute.notes && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Notes:</span> {dispute.notes}
                    </p>
                  )}
                  {dispute.resolvedBy && dispute.resolvedAt && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Resolved by {dispute.resolvedBy} on {formatDate(dispute.resolvedAt)}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Created: {formatDate(dispute.createdAt)}</span>
                    <span>•</span>
                    <span>Related: {dispute.relatedType} #{dispute.relatedId}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {dispute.status.toLowerCase().replace("_", "") === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleReview(dispute)}>
                        Review
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleResolve(dispute)}>
                        Resolve
                      </Button>
                    </>
                  )}
                  {dispute.status.toLowerCase().replace("_", "") === "inreview" && (
                    <Button size="sm" variant="outline" onClick={() => handleResolve(dispute)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedDispute(null);
          setReviewNotes("");
        }}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Review Dispute
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Add notes and mark this dispute as under review.
            </p>
          </div>

          <div className="px-2">
            {selectedDispute && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <h5 className="font-semibold text-gray-900 dark:text-white/90">{selectedDispute.title}</h5>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{selectedDispute.description}</p>
              </div>
            )}

            <div className="mb-6">
              <Label>Review Notes</Label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={5}
                placeholder="Enter review notes..."
              />
            </div>

            <div className="flex items-center gap-3 lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedDispute(null);
                  setReviewNotes("");
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={saveReview}>
                Mark as In Review
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => {
          setShowResolveModal(false);
          setSelectedDispute(null);
          setReviewNotes("");
        }}
        className="max-w-[600px] m-4"
      >
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Resolve Dispute
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Add resolution notes and mark this dispute as resolved.
            </p>
          </div>

          <div className="px-2">
            {selectedDispute && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <h5 className="font-semibold text-gray-900 dark:text-white/90">{selectedDispute.title}</h5>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{selectedDispute.description}</p>
              </div>
            )}

            <div className="mb-6">
              <Label>Resolution Notes</Label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={5}
                placeholder="Enter resolution notes..."
              />
            </div>

            <div className="flex items-center gap-3 lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedDispute(null);
                  setReviewNotes("");
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={saveResolve}>
                Mark as Resolved
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Info Cards */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
            Triage Checklist
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>• Review evidence from booking and payment services.</li>
            <li>• Collect statements from involved co-owners.</li>
            <li>• Coordinate with admins for final arbitration decisions.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-200">Tip</p>
          <p className="mt-2">
            Use report-service analytics to spot recurring patterns, then surface proactive training opportunities for groups with repeated disputes.
          </p>
        </div>
      </div>
    </>
  );
};

export default DisputeTracking;
