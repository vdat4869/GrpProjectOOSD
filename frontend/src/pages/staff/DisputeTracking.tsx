/**
 * Trang theo dõi tranh chấp cho Staff
 * Hỗ trợ quản trị viên bằng cách phân loại các vấn đề, ghi nhận cập nhật và thông báo cho đồng sở hữu
 */
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

/**
 * Interface cho tranh chấp tiềm năng
 */
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

/**
 * Chuyển đổi Dispute từ API sang PotentialDispute để tương thích
 * @param dispute - Dispute từ API
 * @returns PotentialDispute
 */
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

  /**
   * Tải danh sách tranh chấp khi component mount
   */
  useEffect(() => {
    loadDisputes();
  }, []);

  /**
   * Tải danh sách tranh chấp từ database và phát hiện tranh chấp mới
   */
  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Đầu tiên, thử tải các tranh chấp hiện có từ database
      const existingDisputes = await disputeService.getDisputes();
      if (existingDisputes.length > 0) {
        // Chuyển đổi và set disputes từ database
        setDisputes(existingDisputes.map(convertDisputeToPotential));
      }

      // Sau đó, phát hiện các tranh chấp tiềm năng mới và lưu vào database
      await detectAndSaveNewDisputes();

      // Tải lại từ database sau khi lưu các tranh chấp mới
      const allDisputes = await disputeService.getDisputes();
      setDisputes(allDisputes.map(convertDisputeToPotential));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách tranh chấp");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Phát hiện và lưu các tranh chấp mới vào database
   */
  const detectAndSaveNewDisputes = async () => {
    try {
      // Tải bookings, cost shares và vehicle groups
      const [bookings, vehicleGroups] = await Promise.all([
        bookingService.getBookings(),
        ownershipService.getGroups(),
      ]);

      // Tải cost shares cho từng nhóm
      const costSharesPromises = vehicleGroups.map((group) =>
        paymentService.getCostShares(group.id).catch(() => [])
      );
      const costSharesArrays = await Promise.all(costSharesPromises);
      const allCostShares = costSharesArrays.flat();

      const potentialDisputes: CreateDisputeDto[] = [];

      // Kiểm tra xung đột đặt chỗ (đặt chỗ trùng lặp, nhiều hủy)
      const cancelledBookings = bookings.filter((b) => b.status.toLowerCase() === "cancelled");
      cancelledBookings.forEach((booking) => {
        potentialDisputes.push({
          type: "cancellation",
          title: `Đặt Chỗ #${booking.id} Đã Hủy`,
          description: `Đặt chỗ cho xe #${booking.vehicleId} đã bị hủy. Kiểm tra xung đột hoặc vấn đề.`,
          severity: "medium",
          relatedId: booking.id.toString(),
          relatedType: "booking",
        });
      });

      // Kiểm tra đặt chỗ trùng lặp (xung đột tiềm năng)
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

            // Kiểm tra trùng lặp
            if (start1 <= end2 && start2 <= end1) {
              potentialDisputes.push({
                type: "booking_conflict",
                title: `Xung Đột Đặt Chỗ: #${b1.id} và #${b2.id}`,
                description: `Hai đặt chỗ cho xe #${b1.vehicleId} có thời gian trùng lặp.`,
                severity: "high",
                relatedId: b1.id.toString(),
                relatedType: "booking",
              });
            }
          }
        }
      }

      // Kiểm tra đặt chỗ có vấn đề (không check-in sau thời gian đã lên lịch, check-out quá hạn lâu)
      const now = new Date();
      bookings.forEach((booking) => {
        const startTime = new Date(booking.startTime);
        const endTime = new Date(booking.endTime);
        const status = booking.status.toLowerCase();

        // Đặt chỗ đã xác nhận nhưng quá thời gian bắt đầu mà chưa check-in
        if (status === "confirmed" && now > startTime && !booking.checkInTime) {
          const hoursPast = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60 * 60));
          if (hoursPast > 1) {
            potentialDisputes.push({
              type: "booking_conflict",
              title: `Không Xuất Hiện: Đặt Chỗ #${booking.id}`,
              description: `Đặt chỗ cho xe #${booking.vehicleId} đã được xác nhận nhưng không có check-in. Quá ${hoursPast} giờ so với thời gian đã lên lịch.`,
              severity: "medium",
              relatedId: booking.id.toString(),
              relatedType: "booking",
            });
          }
        }

        // Đặt chỗ đã check-in nhưng quá thời gian kết thúc mà chưa check-out
        if (booking.checkInTime && !booking.checkOutTime && now > endTime) {
          const hoursPast = Math.floor((now.getTime() - endTime.getTime()) / (1000 * 60 * 60));
          if (hoursPast > 2) {
            potentialDisputes.push({
              type: "booking_conflict",
              title: `Check-out Quá Hạn: Đặt Chỗ #${booking.id}`,
              description: `Đặt chỗ cho xe #${booking.vehicleId} quá hạn ${hoursPast} giờ. Cần check-out.`,
              severity: "high",
              relatedId: booking.id.toString(),
              relatedType: "booking",
            });
          }
        }
      });

      // Kiểm tra vấn đề thanh toán (cost shares quá hạn, thanh toán thất bại)
      allCostShares.forEach((costShare) => {
        const dueDate = new Date(costShare.dueDate);
        const now = new Date();
        const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Cost share quá hạn
        if (costShare.status === PaymentStatus.Pending && now > dueDate && daysPastDue > 7) {
          potentialDisputes.push({
            type: "overdue_payment",
            title: `Thanh Toán Quá Hạn: ${costShare.title}`,
            description: `Chia sẻ chi phí cho ${costShare.title} quá hạn ${daysPastDue} ngày. Số tiền: ${costShare.currency} ${costShare.totalAmount.toLocaleString()}`,
            severity: daysPastDue > 30 ? "high" : "medium",
            relatedId: costShare.id.toString(),
            relatedType: "cost_share",
          });
        }

        // Kiểm tra chi tiết cost share cho các mục chưa thanh toán
        if (costShare.costShareDetails) {
          costShare.costShareDetails.forEach((detail) => {
            if (detail.status === PaymentStatus.Failed) {
              potentialDisputes.push({
                type: "payment_issue",
                title: `Thanh Toán Thất Bại: ${costShare.title}`,
                description: `Thanh toán thất bại cho chi tiết chia sẻ chi phí #${detail.id}. Số tiền: ${detail.currency} ${detail.amount.toLocaleString()}`,
                severity: "high",
                relatedId: detail.id.toString(),
                relatedType: "payment",
              });
            }
          });
        }
      });

      // Lưu hàng loạt các tranh chấp đã phát hiện vào database
      if (potentialDisputes.length > 0) {
        try {
          await disputeService.bulkCreateDisputes(potentialDisputes);
        } catch (err) {
          console.error("Không thể lưu các tranh chấp đã phát hiện:", err);
        }
      }
    } catch (err) {
      console.error("Không thể phát hiện tranh chấp:", err);
    }
  };

  /**
   * Xử lý khi click nút xem xét tranh chấp
   * @param dispute - Tranh chấp cần xem xét
   */
  const handleReview = (dispute: PotentialDispute) => {
    setSelectedDispute(dispute);
    setReviewNotes(dispute.notes || "");
    setShowReviewModal(true);
  };

  /**
   * Xử lý khi click nút giải quyết tranh chấp
   * @param dispute - Tranh chấp cần giải quyết
   */
  const handleResolve = (dispute: PotentialDispute) => {
    setSelectedDispute(dispute);
    setReviewNotes(dispute.notes || "");
    setShowResolveModal(true);
  };

  /**
   * Lưu đánh giá tranh chấp
   */
  const saveReview = async () => {
    if (!selectedDispute) return;

    try {
      setError(null);
      // Cập nhật tranh chấp trong database qua API
      await disputeService.updateDispute(selectedDispute.id, {
        status: "in_review",
        notes: reviewNotes,
      });

      // Tải lại tranh chấp từ database
      await loadDisputes();

      setShowReviewModal(false);
      setSelectedDispute(null);
      setReviewNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật tranh chấp");
    }
  };

  /**
   * Lưu giải quyết tranh chấp
   */
  const saveResolve = async () => {
    if (!selectedDispute) return;

    try {
      setError(null);
      const userEmail = localStorage.getItem("email") || "Nhân viên";
      
      // Cập nhật tranh chấp trong database qua API
      await disputeService.updateDispute(selectedDispute.id, {
        status: "resolved",
        notes: reviewNotes,
        resolvedBy: userEmail,
      });

      // Tải lại tranh chấp từ database
      await loadDisputes();

      setShowResolveModal(false);
      setSelectedDispute(null);
      setReviewNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể giải quyết tranh chấp");
    }
  };

  /**
   * Lọc tranh chấp theo filter đã chọn
   * @returns Danh sách tranh chấp đã lọc
   */
  const filteredDisputes = disputes.filter((dispute) => {
    if (filter === "all") return true;
    // Khớp status bất kể chữ hoa/thường và định dạng (Pending/pending, InReview/in_review, Resolved/resolved)
    const disputeStatusLower = dispute.status.toLowerCase().replace("_", "");
    const filterLower = filter.toLowerCase().replace("_", "");
    return disputeStatusLower === filterLower;
  });

  /**
   * Lấy màu hiển thị cho mức độ nghiêm trọng
   * @param severity - Mức độ nghiêm trọng ("low", "medium", "high")
   * @returns CSS classes cho màu
   */
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

  /**
   * Lấy nhãn loại tranh chấp (tiếng Việt)
   * @param type - Loại tranh chấp
   * @returns Nhãn loại tranh chấp
   */
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "booking_conflict":
        return "Xung Đột Đặt Chỗ";
      case "payment_issue":
        return "Vấn Đề Thanh Toán";
      case "cancellation":
        return "Hủy Bỏ";
      case "refund":
        return "Hoàn Tiền";
      case "overdue_payment":
        return "Thanh Toán Quá Hạn";
      default:
        return type;
    }
  };

  /**
   * Định dạng ngày giờ theo định dạng Việt Nam
   * @param dateString - Chuỗi ngày giờ
   * @returns Ngày giờ đã định dạng
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

  return (
    <>
      <PageMeta title="Nhân viên | Theo Dõi Tranh Chấp" />
      <PageHeader
        title="Theo Dõi Tranh Chấp"
        description="Hỗ trợ quản trị viên bằng cách phân loại các vấn đề, ghi nhận cập nhật và thông báo cho đồng sở hữu."
        actions={
          <Button size="sm" onClick={loadDisputes} disabled={loading}>
            Làm Mới
          </Button>
        }
      />

      {/* Bộ Lọc */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "primary" : "outline"}
          onClick={() => setFilter("all")}
        >
          Tất Cả ({disputes.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "pending" ? "primary" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Chờ Xử Lý ({disputes.filter((d) => d.status === "pending").length})
        </Button>
        <Button
          size="sm"
          variant={filter === "in_review" ? "primary" : "outline"}
          onClick={() => setFilter("in_review")}
        >
          Đang Xem Xét ({disputes.filter((d) => d.status === "in_review").length})
        </Button>
        <Button
          size="sm"
          variant={filter === "resolved" ? "primary" : "outline"}
          onClick={() => setFilter("resolved")}
        >
          Đã Giải Quyết ({disputes.filter((d) => d.status === "resolved").length})
        </Button>
      </div>

      {/* Danh Sách Tranh Chấp */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Đang tải danh sách tranh chấp...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-200">{error}</p>
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
              Danh Sách Kiểm Tra Phân Loại
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>• Xem xét bằng chứng từ dịch vụ đặt chỗ và thanh toán.</li>
              <li>• Thu thập tuyên bố từ các đồng sở hữu liên quan.</li>
              <li>• Phối hợp với quản trị viên để đưa ra quyết định phân xử cuối cùng.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <p className="font-medium text-gray-700 dark:text-gray-200">Không Tìm Thấy Tranh Chấp</p>
            <p className="mt-2">
              Không phát hiện tranh chấp tiềm năng nào. Hệ thống đang theo dõi đặt chỗ và thanh toán để phát hiện vấn đề.
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
                      <span className="font-medium">Ghi chú:</span> {dispute.notes}
                    </p>
                  )}
                  {dispute.resolvedBy && dispute.resolvedAt && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Đã giải quyết bởi {dispute.resolvedBy} vào {formatDate(dispute.resolvedAt)}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Tạo: {formatDate(dispute.createdAt)}</span>
                    <span>•</span>
                    <span>Liên quan: {dispute.relatedType} #{dispute.relatedId}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {dispute.status.toLowerCase().replace("_", "") === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleReview(dispute)}>
                        Xem Xét
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleResolve(dispute)}>
                        Giải Quyết
                      </Button>
                    </>
                  )}
                  {dispute.status.toLowerCase().replace("_", "") === "inreview" && (
                    <Button size="sm" variant="outline" onClick={() => handleResolve(dispute)}>
                      Giải Quyết
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
              Xem Xét Tranh Chấp
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Thêm ghi chú và đánh dấu tranh chấp này là đang được xem xét.
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
              <Label>Ghi Chú Xem Xét</Label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={5}
                placeholder="Nhập ghi chú xem xét..."
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
                Hủy
              </Button>
              <Button size="sm" onClick={saveReview}>
                Đánh Dấu Đang Xem Xét
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
              Giải Quyết Tranh Chấp
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Thêm ghi chú giải quyết và đánh dấu tranh chấp này là đã được giải quyết.
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
              <Label>Ghi Chú Giải Quyết</Label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={5}
                placeholder="Nhập ghi chú giải quyết..."
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
                Hủy
              </Button>
              <Button size="sm" onClick={saveResolve}>
                Đánh Dấu Đã Giải Quyết
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Info Cards */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
            Danh Sách Kiểm Tra Phân Loại
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>• Xem xét bằng chứng từ dịch vụ đặt chỗ và thanh toán.</li>
            <li>• Thu thập tuyên bố từ các đồng sở hữu liên quan.</li>
            <li>• Phối hợp với quản trị viên để đưa ra quyết định phân xử cuối cùng.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-200">Mẹo</p>
          <p className="mt-2">
            Sử dụng phân tích từ dịch vụ báo cáo để phát hiện các mẫu lặp lại, sau đó đề xuất cơ hội đào tạo chủ động cho các nhóm có tranh chấp lặp lại.
          </p>
        </div>
      </div>
    </>
  );
};

export default DisputeTracking;
