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
import { ownershipService } from "../../services/ownershipService";
import CreateCostShareModal from "../../components/modals/CreateCostShareModal";
import CreatePaymentModal from "../../components/modals/CreatePaymentModal";
import PaymentTypeModal from "../../components/modals/PaymentTypeModal";

/**
 * Trang quản lý cost shares - xem và quản lý chi phí chia sẻ cho các nhóm xe
 */
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
  const [coOwnerId, setCoOwnerId] = useState<string | null>(null); // GUID của co-owner
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  /**
   * Tải co-owner ID (GUID) để khớp với cost share detail userId
   */
  useEffect(() => {
    const loadCoOwnerId = async () => {
      if (userId) {
        try {
          const coOwner = await ownershipService.getCoOwnerByUserId(userId);
          if (coOwner) {
            setCoOwnerId(coOwner.id); // Đây là GUID cần thiết
            console.log('Co-owner đã tải:', { userId, coOwnerId: coOwner.id });
          }
        } catch (err) {
          console.error("Không thể tải co-owner:", err);
        }
      }
    };
    
    loadCoOwnerId();
    loadCostShares();
    // Hiển thị modal chọn loại thanh toán khi lần đầu truy cập
    const hasSeenModal = sessionStorage.getItem("payment-type-selected");
    if (!hasSeenModal) {
      setShowPaymentTypeModal(true);
    }
  }, [userId]);

  /**
   * Tải danh sách cost shares cho user
   */
  const loadCostShares = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Lấy danh sách nhóm xe của user trước
      let userGroupIds: string[] = [];
      if (userId) {
        try {
          const coOwner = await ownershipService.getCoOwnerByUserId(userId);
          if (coOwner) {
            const ownerships = await ownershipService.getOwnerships(undefined, coOwner.id, true);
            userGroupIds = [...new Set(ownerships.map(o => o.vehicleGroupId))];
          }
        } catch (err) {
          console.error("Không thể tải nhóm xe của user:", err);
        }
      }
      
      // Tải cost shares cho các nhóm xe của user
      let allCostShares: CostShare[] = [];
      if (userGroupIds.length > 0) {
        // Tải cost shares cho từng nhóm
        const costSharesPromises = userGroupIds.map(groupId => 
          paymentService.getCostShares(groupId).catch(() => [])
        );
        const costSharesArrays = await Promise.all(costSharesPromises);
        allCostShares = costSharesArrays.flat();
      } else {
        // Nếu không có nhóm, thử tải tất cả (cho admin/staff)
        const data = await paymentService.getCostShares();
        allCostShares = data;
      }
      
      // Tải chi tiết cho từng cost share
      const costSharesWithDetails = await Promise.all(
        allCostShares.map(async (costShare) => {
          try {
            const details = await paymentService.getCostShareDetails(costShare.id);
            return { ...costShare, costShareDetails: details };
          } catch (err) {
            console.error(`Không thể tải chi tiết cho cost share ${costShare.id}:`, err);
            return costShare;
          }
        })
      );
      
      setCostShares(costSharesWithDetails);

      // Tính toán số tiền chờ thanh toán cho user hiện tại
      // Sử dụng coOwnerId (GUID) thay vì userId (number) để khớp với detail.userId
      let pending = 0;
      let totalPending = 0;
      const currentCoOwnerId = coOwnerId ? String(coOwnerId).toLowerCase().trim() : null;
      
      costSharesWithDetails.forEach((costShare) => {
        if (costShare.costShareDetails) {
          costShare.costShareDetails.forEach((detail) => {
            const detailUserId = String(detail.userId).toLowerCase().trim();
            // Chuẩn hóa status thành number (PaymentStatus enum)
            let detailStatus: PaymentStatus;
            if (typeof detail.status === 'number') {
              detailStatus = detail.status as PaymentStatus;
            } else if (typeof detail.status === 'string') {
              // Chuyển string thành enum
              detailStatus = (detail.status === 'Pending' || detail.status === '0') 
                ? PaymentStatus.Pending 
                : PaymentStatus.Completed; // Fallback mặc định
            } else {
              detailStatus = detail.status;
            }
            const isPending = detailStatus === PaymentStatus.Pending;
            
            // So sánh với coOwnerId (GUID) thay vì userId (number)
            if (currentCoOwnerId && detailUserId === currentCoOwnerId && isPending) {
              pending++;
              totalPending += detail.amount;
            }
          });
        }
      });
      setPendingCount(pending);
      setTotalPendingAmount(totalPending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải cost shares");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Định dạng ngày tháng
   * @param dateString - Chuỗi ngày tháng
   * @returns Ngày tháng đã định dạng
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  /**
   * Định dạng số tiền
   * @param amount - Số tiền
   * @returns Số tiền đã định dạng (₫)
   */
  const formatAmount = (amount: number) => {
    return `₫${amount.toLocaleString()}`;
  };

  /**
   * Lấy nhãn loại chi phí (tiếng Việt)
   * @param type - Loại chi phí
   * @returns Nhãn loại chi phí
   */
  const getCostTypeLabel = (type: CostType) => {
    switch (type) {
      case CostType.Charging:
        return "Sạc điện";
      case CostType.Insurance:
        return "Bảo hiểm";
      case CostType.Maintenance:
        return "Bảo dưỡng";
      case CostType.Registration:
        return "Đăng ký";
      case CostType.Cleaning:
        return "Vệ sinh";
      case CostType.Parking:
        return "Đỗ xe";
      case CostType.Toll:
        return "Phí cầu đường";
      case CostType.Other:
        return "Khác";
      default:
        return "Không xác định";
    }
  };

  /**
   * Lấy nhãn trạng thái thanh toán (tiếng Việt)
   * @param status - Trạng thái thanh toán
   * @returns Nhãn trạng thái
   */
  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.Pending:
        return "Chờ thanh toán";
      case PaymentStatus.Processing:
        return "Đang xử lý";
      case PaymentStatus.Completed:
        return "Hoàn thành";
      case PaymentStatus.Failed:
        return "Thất bại";
      case PaymentStatus.Cancelled:
        return "Đã hủy";
      case PaymentStatus.Refunded:
        return "Đã hoàn tiền";
      default:
        return "Không xác định";
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

  /**
   * Xử lý khi click nút thanh toán
   * @param costShareDetailId - ID của cost share detail
   * @param amount - Số tiền cần thanh toán
   */
  const handlePay = (costShareDetailId: string, amount: number) => {
    setSelectedCostShareDetailId(costShareDetailId);
    setSelectedAmount(amount);
    setIsPaymentModalOpen(true);
  };

  /**
   * Xử lý khi thanh toán thành công
   */
  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    setSelectedCostShareDetailId(null);
    setSelectedAmount(0);
    loadCostShares();
  };

  return (
    <>
      <PageMeta title="Đồng sở hữu | Chia Sẻ Chi Phí" />
      <PageHeader
        title="Chia Sẻ Chi Phí"
        description="Xem và quản lý chi phí chia sẻ cho các nhóm xe của bạn."
      />

      {/* Pending Payments Alert */}
      {pendingCount > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-theme-xs dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Bạn có {pendingCount} khoản thanh toán đang chờ{pendingCount > 1 ? "" : ""}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Tổng số tiền cần thanh toán: <span className="font-semibold">{formatAmount(totalPendingAmount)}</span>
              </p>
            </div>
            <button
              onClick={() => {
                // Cuộn đến khoản thanh toán chờ đầu tiên
                const firstPending = document.querySelector('[data-pending="true"]');
                if (firstPending) {
                  firstPending.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              Xem Thanh Toán Chờ
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
        >
          Tạo Chia Sẻ Chi Phí
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải chia sẻ chi phí...</p>
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
                Không tìm thấy chia sẻ chi phí nào.
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
                        {costShare.description || "Không có mô tả"}
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
                    <span>Loại: {getCostTypeLabel(costShare.costType)}</span>
                    <span>Hạn thanh toán: {formatDate(costShare.dueDate)}</span>
                  </div>
                </div>
                {costShare.costShareDetails &&
                  costShare.costShareDetails.length > 0 && (
                    <div className="p-4">
                      <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Chi Tiết Chia Sẻ Chi Phí
                      </h4>
                      <div className="space-y-2">
                        {costShare.costShareDetails.map((detail) => {
                          // Use coOwnerId (GUID) to match with detail.userId (GUID)
                          // NOT userId (number) from localStorage
                          const detailUserId = String(detail.userId).toLowerCase().trim();
                          const currentCoOwnerId = coOwnerId ? String(coOwnerId).toLowerCase().trim() : null;
                          const isUserDetail = currentCoOwnerId && detailUserId === currentCoOwnerId;
                          
                          // Normalize status to PaymentStatus enum
                          let detailStatus: PaymentStatus;
                          if (typeof detail.status === 'number') {
                            detailStatus = detail.status as PaymentStatus;
                          } else if (typeof detail.status === 'string') {
                            // Convert string to enum
                            detailStatus = (detail.status === 'Pending' || detail.status === '0') 
                              ? PaymentStatus.Pending 
                              : PaymentStatus.Completed; // Default fallback
                          } else {
                            detailStatus = detail.status;
                          }
                          const isPending = detailStatus === PaymentStatus.Pending;
                          
                          const isUserPending = isUserDetail && isPending;
                          
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
                                  {isUserDetail ? (
                                    <span className="font-semibold">Bạn</span>
                                  ) : (
                                    `Người dùng: ${detail.userId.substring(0, 8)}...`
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Tỷ lệ sở hữu: {detail.ownershipPercentage}% | Số tiền:{" "}
                                  {formatAmount(detail.amount)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                                    detailStatus
                                  )}`}
                                >
                                  {getStatusLabel(detailStatus)}
                                </span>
                                {isUserPending && (
                                  <button
                                    onClick={() => handlePay(detail.id, detail.amount)}
                                    className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 shadow-md hover:shadow-lg transition-all"
                                  >
                                    Thanh Toán Ngay
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

