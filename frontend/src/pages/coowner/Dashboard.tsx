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

/**
 * Dashboard cho Co-owner - hiển thị tổng quan về bookings, payments, và xu hướng sử dụng
 */
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

  /**
   * Tải dữ liệu dashboard khi component mount
   */
  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * Tải tất cả dữ liệu cho dashboard: cost shares, bookings, vehicle groups
   */
  const loadDashboardData = async () => {
    try {
      // Tải cost shares và tìm các khoản thanh toán đang chờ của user hiện tại
      const costShares = await paymentService.getCostShares();
      const costSharesMap = new Map<string, CostShare>();
      const allPendingDetails: CostShareDetail[] = [];

      for (const costShare of costShares) {
        costSharesMap.set(costShare.id, costShare);
        try {
          const details = await paymentService.getCostShareDetails(costShare.id);
          // Lọc các khoản thanh toán đang chờ của user hiện tại
          const userPendingDetails = details.filter(
            (detail) =>
              detail.userId === userId && detail.status === PaymentStatus.Pending
          );
          allPendingDetails.push(...userPendingDetails);
        } catch (err) {
          console.error(`Không thể tải chi tiết cho cost share ${costShare.id}:`, err);
        }
      }

      setCostSharesMap(costSharesMap);
      setPendingPayments(allPendingDetails);
      const total = allPendingDetails.reduce((sum, detail) => sum + detail.amount, 0);
      setTotalBalanceDue(total);

      // Tải bookings cho các chuyến đi sắp tới
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
        console.error("Không thể tải bookings:", err);
      }

      // Tải nhóm xe
      try {
        const groups = await ownershipService.getGroups();
        setSharedVehicles(groups.length);
      } catch (err) {
        console.error("Không thể tải nhóm xe:", err);
      }

      // TODO: Tải voting items khi voting service có sẵn
      setVotingItems(0);
    } catch (err) {
      console.error("Không thể tải dữ liệu dashboard:", err);
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
    loadDashboardData();
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
   * Định dạng ngày tháng
   * @param dateString - Chuỗi ngày tháng
   * @returns Ngày tháng đã định dạng
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <PageMeta title="Đồng sở hữu | Bảng Điều Khiển" />
      <PageHeader
        title={`Chào mừng trở lại${firstName ? `, ${firstName}` : ""}`}
        description="Theo dõi bookings, thanh toán và xu hướng sử dụng của bạn trên tất cả các xe điện đồng sở hữu."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chuyến Đi Sắp Tới"
          value={upcomingTrips}
          trend={upcomingTrips > 0 ? "7 ngày tới" : "Không có chuyến đi"}
        />
        <StatCard
          label="Xe Đồng Sở Hữu"
          value={sharedVehicles}
          trend={sharedVehicles > 0 ? "Đang hoạt động" : "Không có xe"}
        />
        <StatCard
          label="Số Tiền Cần Thanh Toán"
          value={formatAmount(totalBalanceDue)}
          trend={totalBalanceDue > 0 ? `${pendingPayments.length} đang chờ` : "Đã thanh toán đủ"}
        />
        <StatCard label="Mục Biểu Quyết" value={votingItems} trend={votingItems > 0 ? "Mới" : "Không có"} />
      </div>

      {/* Phần Thanh Toán Đang Chờ */}
      {pendingPayments.length > 0 && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-theme-xs dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Thanh Toán Đang Chờ
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Bạn có {pendingPayments.length} khoản thanh toán đang chờ{pendingPayments.length > 1 ? "" : ""}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("/coowner/cost-shares")}
              variant="outline"
            >
              Xem Tất Cả
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
                      Số tiền: {formatAmount(detail.amount)} • Tỷ lệ sở hữu: {detail.ownershipPercentage}%
                      {dueDate && ` • Hạn thanh toán: ${dueDate}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePay(detail.id, detail.amount)}
                    className="ml-4"
                  >
                    Thanh Toán Ngay
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
                Xem thêm {pendingPayments.length - 3} khoản thanh toán{pendingPayments.length - 3 > 1 ? "" : ""}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            Xu Hướng Sử Dụng Cá Nhân
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Xem tần suất bạn đã đặt xe so với mức trung bình của nhóm trong 12 tháng qua.
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
