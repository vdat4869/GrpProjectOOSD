/**
 * Trang giám sát chi phí cho Staff
 * Theo dõi chi phí phát sinh trong quá trình sử dụng xe và hỗ trợ tạo báo cáo chi tiết cho quản trị viên
 */
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { paymentService, CostShare, PaymentStatus, CostType } from "../../services/paymentService";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";

const CostMonitoring: React.FC = () => {
  const [costShares, setCostShares] = useState<CostShare[]>([]);
  const [vehicles, setVehicles] = useState<VehicleGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  /**
   * Tải dữ liệu khi component mount
   */
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Tải cost shares khi selectedGroupId thay đổi
   */
  useEffect(() => {
    if (selectedGroupId) {
      loadCostShares(selectedGroupId);
    }
  }, [selectedGroupId]);

  /**
   * Tải danh sách nhóm xe
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ownershipService.getGroups();
      setVehicles(data);
      if (data.length > 0) {
        setSelectedGroupId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tải danh sách cost shares cho một nhóm
   * @param groupId - ID của nhóm
   */
  const loadCostShares = async (groupId: string) => {
    try {
      const allCostShares = await paymentService.getCostShares();
      const groupCostShares = allCostShares.filter((cs) => cs.groupId === groupId);
      setCostShares(groupCostShares);
    } catch (err) {
      console.error("Không thể tải chia sẻ chi phí:", err);
    }
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
   * Lấy màu hiển thị cho trạng thái thanh toán
   * @param status - Trạng thái thanh toán
   * @returns CSS classes cho màu
   */
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
      default:
        return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
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

  /**
   * Lọc cost shares theo filter đã chọn
   * @returns Danh sách cost shares đã lọc
   */
  const filteredCostShares = () => {
    if (filter === "all") return costShares;
    if (filter === "pending") {
      return costShares.filter((cs) => cs.status === PaymentStatus.Pending);
    }
    if (filter === "completed") {
      return costShares.filter((cs) => cs.status === PaymentStatus.Completed);
    }
    return costShares;
  };

  /**
   * Tính tổng số tiền theo từng trạng thái
   * @returns Tổng số tiền (total, pending, completed)
   */
  const calculateTotals = () => {
    const filtered = filteredCostShares();
    const total = filtered.reduce((sum, cs) => sum + cs.totalAmount, 0);
    const pending = filtered
      .filter((cs) => cs.status === PaymentStatus.Pending)
      .reduce((sum, cs) => sum + cs.totalAmount, 0);
    const completed = filtered
      .filter((cs) => cs.status === PaymentStatus.Completed)
      .reduce((sum, cs) => sum + cs.totalAmount, 0);
    return { total, pending, completed };
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
   * Định dạng ngày tháng theo định dạng Việt Nam
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

  const totals = calculateTotals();

  return (
    <>
      <PageMeta title="Nhân viên | Giám Sát Chi Phí" />
      <PageHeader
        title="Giám Sát Chi Phí"
        description="Theo dõi chi phí phát sinh trong quá trình sử dụng xe và hỗ trợ tạo báo cáo chi tiết cho quản trị viên."
        actions={<Button size="sm" onClick={loadData} disabled={loading}>Làm Mới</Button>}
      />

      {/* Chọn Nhóm Xe */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chọn Nhóm Xe
        </label>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.name} - {vehicle.vehicleName}
            </option>
          ))}
        </select>
      </div>

      {/* Thẻ Tóm Tắt */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tổng Số Tiền</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white/90">
            {formatAmount(totals.total)}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-theme-xs dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-sm text-amber-600 dark:text-amber-300">Chờ Thanh Toán</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-200">
            {formatAmount(totals.pending)}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-theme-xs dark:border-emerald-500/40 dark:bg-emerald-500/10">
          <p className="text-sm text-emerald-600 dark:text-emerald-300">Đã Hoàn Thành</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-200">
            {formatAmount(totals.completed)}
          </p>
        </div>
      </div>

      {/* Bộ Lọc */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "primary" : "outline"}
          onClick={() => setFilter("all")}
        >
          Tất Cả
        </Button>
        <Button
          size="sm"
          variant={filter === "pending" ? "primary" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Chờ Thanh Toán
        </Button>
        <Button
          size="sm"
          variant={filter === "completed" ? "primary" : "outline"}
          onClick={() => setFilter("completed")}
        >
          Đã Hoàn Thành
        </Button>
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
        <div className="grid gap-4">
          {filteredCostShares().length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">Không tìm thấy chia sẻ chi phí nào cho nhóm này.</p>
            </div>
          ) : (
            filteredCostShares().map((costShare) => (
              <div
                key={costShare.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                          {costShare.title}
                        </h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(costShare.status)}`}>
                          {getStatusLabel(costShare.status)}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {getCostTypeLabel(costShare.costType)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Số tiền: {formatAmount(costShare.totalAmount)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Hạn: {formatDate(costShare.dueDate)} • Tạo: {formatDate(costShare.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {costShare.description && (
                  <div className="p-4 pt-0">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{costShare.description}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
};

export default CostMonitoring;

