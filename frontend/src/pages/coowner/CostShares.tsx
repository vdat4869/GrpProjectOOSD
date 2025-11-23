import { useEffect, useState } from "react";
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

/**
 * Trang quản lý cost shares - xem và quản lý chi phí chia sẻ cho các nhóm xe
 */
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
    // Mặc định là thanh toán cá nhân, không hiển thị popup
    sessionStorage.setItem("payment-type-selected", "true");
    sessionStorage.setItem("payment-type", "personal");
    
    // Listen for payment completion events to refresh cost shares
    const handlePaymentCompleted = () => {
      console.log('[CostShares] Payment completed event received, refreshing cost shares...');
      // Delay và retry nhiều lần để đảm bảo backend đã xử lý xong
      setTimeout(() => {
        loadCostShares(0); // Start with retry count 0
      }, 2000);
      // Retry again after 5 seconds
      setTimeout(() => {
        console.log('[CostShares] Second retry after payment...');
        loadCostShares(1);
      }, 5000);
    };
    
    // Also check sessionStorage flag when component mounts
    const checkPaymentFlag = () => {
      const paymentJustCompleted = sessionStorage.getItem('paymentJustCompleted');
      if (paymentJustCompleted === 'true') {
        console.log('[CostShares] Payment flag detected, refreshing...');
        setTimeout(() => {
          loadCostShares();
          sessionStorage.removeItem('paymentJustCompleted');
        }, 2000);
      }
    };
    
    window.addEventListener('paymentCompleted', handlePaymentCompleted);
    checkPaymentFlag(); // Check immediately on mount
    
    // Also listen for window focus (when user returns from VNPay)
    const handleFocus = () => {
      const paymentJustCompleted = sessionStorage.getItem('paymentJustCompleted');
      if (paymentJustCompleted === 'true') {
        console.log('[CostShares] Window focused after payment, refreshing...');
        setTimeout(() => {
          loadCostShares();
          sessionStorage.removeItem('paymentJustCompleted');
        }, 2000);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('paymentCompleted', handlePaymentCompleted);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId]);

  /**
   * Tải danh sách cost shares cho user với retry mechanism
   * @param retryCount - Số lần retry (mặc định 0)
   */
  const loadCostShares = async (retryCount: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`[CostShares] Loading cost shares, attempt ${retryCount + 1}`);
      
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
      
      console.log(`[CostShares] Found ${allCostShares.length} cost shares`);
      
      // Tải chi tiết cho từng cost share
      const costSharesWithDetails = await Promise.all(
        allCostShares.map(async (costShare) => {
          try {
            const details = await paymentService.getCostShareDetails(costShare.id);
            console.log(`[CostShares] Cost share ${costShare.id} has ${details.length} details, paid: ${details.filter(d => d.status === 2).length}`);
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
              detailStatus = detail.status;
            } else if (typeof detail.status === 'string') {
              const statusStr = detail.status as string;
              detailStatus = statusStr.toLowerCase().includes('paid') || statusStr === '2' ? PaymentStatus.Completed : PaymentStatus.Pending;
            } else {
              detailStatus = PaymentStatus.Pending;
            }
            
            if (currentCoOwnerId && detailUserId === currentCoOwnerId && detailStatus === PaymentStatus.Pending) {
              pending++;
              totalPending += detail.amount;
            }
          });
        }
      });
      
      setPendingCount(pending);
      setTotalPendingAmount(totalPending);
      
      // Nếu đang retry và vẫn không có data mới, thử lại sau 3 giây
      if (retryCount > 0 && retryCount < 3 && costSharesWithDetails.length === 0) {
        console.log(`[CostShares] No cost shares found, retrying in 3 seconds... (${retryCount}/3)`);
        setTimeout(() => {
          loadCostShares(retryCount + 1);
        }, 3000);
      }
    } catch (err) {
      console.error('[CostShares] Error loading cost shares:', err);
      setError(err instanceof Error ? err.message : "Không thể tải chia sẻ chi phí");
      
      // Retry on error
      if (retryCount < 2) {
        console.log(`[CostShares] Retrying after error... (${retryCount + 1}/2)`);
        setTimeout(() => {
          loadCostShares(retryCount + 1);
        }, 2000);
      }
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
  const handlePaymentSuccess = async () => {
    setIsPaymentModalOpen(false);
    setSelectedCostShareDetailId(null);
    setSelectedAmount(0);
    // Reload data để cập nhật lịch sử thanh toán
    await loadCostShares();
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
                            // Convert string to enum - kiểm tra nhiều trường hợp
                            const statusLower = (detail.status as string).toLowerCase().trim();
                            if (statusLower === 'pending' || statusLower === '0' || statusLower === 'chờ thanh toán' || statusLower === 'unpaid') {
                              detailStatus = PaymentStatus.Pending;
                            } else if (statusLower === 'completed' || statusLower === 'paid' || statusLower === '2' || statusLower === 'đã thanh toán' || statusLower === 'completed') {
                              detailStatus = PaymentStatus.Completed;
                            } else {
                              // Kiểm tra nếu có paidDate thì coi như đã thanh toán
                              detailStatus = detail.paidDate ? PaymentStatus.Completed : PaymentStatus.Pending;
                            }
                          } else {
                            detailStatus = detail.status as PaymentStatus;
                          }
                          // Double check: nếu có paidDate thì chắc chắn đã thanh toán
                          if (detail.paidDate) {
                            detailStatus = PaymentStatus.Completed;
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

