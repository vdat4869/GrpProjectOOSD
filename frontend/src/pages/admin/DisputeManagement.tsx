/**
 * Trang quản lý tranh chấp
 * Cho phép admin giám sát các vấn đề tranh chấp giữa co-owners, đảm bảo SLA được đáp ứng và ghi nhận kết quả
 */
import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { bookingService } from "../../services/bookingService";
import { paymentService, PaymentStatus } from "../../services/paymentService";
import { ownershipService } from "../../services/ownershipService";

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
}

const DisputeManagement: React.FC = () => {
  const [disputes, setDisputes] = useState<PotentialDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "in_review" | "resolved">("all");

  // Load danh sách tranh chấp khi component mount
  useEffect(() => {
    loadDisputes();
  }, []);

  /**
   * Tải và phát hiện các tranh chấp tiềm năng từ bookings và cost shares
   */
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

      // Kiểm tra các booking đã hủy
      const cancelledBookings = bookings.filter((b) => b.status.toLowerCase() === "cancelled");
      cancelledBookings.forEach((booking) => {
        potentialDisputes.push({
          id: `booking-${booking.id}`,
          type: "cancellation",
          title: `Đặt Chỗ #${booking.id} Đã Hủy`,
          description: `Đặt chỗ cho xe #${booking.vehicleId} đã bị hủy.`,
          severity: "medium",
          relatedId: booking.id,
          relatedType: "booking",
          createdAt: booking.createdAt || new Date().toISOString(),
          status: "pending",
        });
      });

      // Kiểm tra các booking trùng lịch
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
                title: `Xung Đột Đặt Chỗ: #${b1.id} & #${b2.id}`,
                description: `Các đặt chỗ trùng lịch cho xe #${b1.vehicleId}.`,
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

      // Kiểm tra các khoản thanh toán quá hạn
      allCostShares.forEach((cs) => {
        const dueDate = new Date(cs.dueDate);
        const now = new Date();
        if (cs.status === PaymentStatus.Pending && now > dueDate) {
          potentialDisputes.push({
            id: `overdue-${cs.id}`,
            type: "overdue_payment",
            title: `Thanh Toán Quá Hạn: ${cs.title}`,
            description: `Chi phí chia sẻ cho ${cs.vehicleId} đã quá hạn thanh toán.`,
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
      setError(err instanceof Error ? err.message : "Không thể tải danh sách tranh chấp");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Lấy màu hiển thị cho mức độ nghiêm trọng
   * @param severity - Mức độ nghiêm trọng
   * @returns Class CSS cho màu
   */
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

  /**
   * Lấy màu hiển thị cho loại tranh chấp
   * @param type - Loại tranh chấp
   * @returns Class CSS cho màu
   */
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

  /**
   * Lọc tranh chấp theo filter
   * @returns Danh sách tranh chấp đã lọc
   */
  const filteredDisputes = disputes.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  /**
   * Định dạng ngày tháng theo định dạng Việt Nam
   * @param dateString - Chuỗi ngày tháng cần định dạng
   * @returns Chuỗi ngày tháng đã định dạng
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Lấy nhãn hiển thị cho loại tranh chấp
   * @param type - Loại tranh chấp
   * @returns Nhãn loại tranh chấp
   */
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      booking_conflict: "Xung Đột Đặt Chỗ",
      payment_issue: "Vấn Đề Thanh Toán",
      cancellation: "Hủy Đặt Chỗ",
      refund: "Hoàn Tiền",
      overdue_payment: "Thanh Toán Quá Hạn",
    };
    return labels[type] || type.replace("_", " ");
  };

  /**
   * Lấy nhãn hiển thị cho trạng thái tranh chấp
   * @param status - Trạng thái tranh chấp
   * @returns Nhãn trạng thái
   */
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Chờ Xử Lý",
      in_review: "Đang Xem Xét",
      resolved: "Đã Giải Quyết",
    };
    return labels[status] || status;
  };

  return (
    <>
      <PageMeta title="Admin | Quản Lý Tranh Chấp" />
      <PageHeader
        title="Quản Lý Tranh Chấp"
        description="Giám sát các vấn đề tranh chấp giữa co-owners, đảm bảo SLA được đáp ứng và ghi nhận kết quả trên các dịch vụ."
        actions={<Button size="sm" onClick={loadDisputes} disabled={loading}>Làm Mới</Button>}
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải danh sách tranh chấp...</p>
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

          <div className="grid gap-4">
            {filteredDisputes.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                <p className="text-gray-600 dark:text-gray-400">Không tìm thấy tranh chấp nào.</p>
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
                            {getTypeLabel(dispute.type)}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityColor(dispute.severity)}`}>
                            {dispute.severity === "high" ? "Cao" : dispute.severity === "medium" ? "Trung Bình" : "Thấp"}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            dispute.status === "pending" 
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
                              : dispute.status === "in_review"
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                          }`}>
                            {getStatusLabel(dispute.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {dispute.description}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Tạo lúc: {formatDate(dispute.createdAt)} • Liên quan: {dispute.relatedType} #{dispute.relatedId}
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
