import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Select from "../form/Select";
import {
  paymentService,
  CreatePaymentRequest,
  PaymentMethodType,
  VNPayCreatePaymentRequest,
} from "../../services/paymentService";
import { ownershipService, GroupFund } from "../../services/ownershipService";

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  costShareDetailId: string;
  amount: number;
}

// Các phương thức thanh toán
const PAYMENT_METHODS = [
  { value: PaymentMethodType.Banking, label: "Ngân hàng" },
  { value: PaymentMethodType.EWallet, label: "Ví điện tử" },
  { value: PaymentMethodType.Cash, label: "Tiền mặt" },
];

// Các cổng thanh toán
const PAYMENT_GATEWAYS = [
  { value: "VNPay", label: "VNPay" },
  { value: "MoMo", label: "MoMo" },
  { value: "ZaloPay", label: "ZaloPay" },
  { value: "None", label: "Thanh toán trực tiếp" },
];

const CreatePaymentModal: React.FC<CreatePaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  costShareDetailId,
  amount,
}) => {
  const [formData, setFormData] = useState({
    method: PaymentMethodType.Banking,
    gateway: "None",
    useGroupFund: false,
    selectedFundId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupFunds, setGroupFunds] = useState<GroupFund[]>([]);
  const [loadingFunds, setLoadingFunds] = useState(false);

  // Tải chi tiết cost share và quỹ nhóm khi modal mở
  useEffect(() => {
    if (isOpen) {
      loadCostShareDetailAndFunds();
    }
  }, [isOpen, costShareDetailId]);

  // Tải chi tiết cost share và quỹ nhóm
  const loadCostShareDetailAndFunds = async () => {
    try {
      setLoadingFunds(true);
      // Lấy tất cả cost shares để tìm cái chứa detail của chúng ta
      const costShares = await paymentService.getCostShares();
      let foundGroupId: string | null = null;
      
      for (const costShare of costShares) {
        try {
          const details = await paymentService.getCostShareDetails(costShare.id);
          const detail = details.find(d => d.id === costShareDetailId);
          if (detail) {
            foundGroupId = costShare.groupId;
            break;
          }
        } catch (err) {
          // Tiếp tục với cost share tiếp theo nếu cái này thất bại
          continue;
        }
      }
      
      // Tải quỹ nhóm nếu tìm thấy groupId
      if (foundGroupId) {
        const funds = await ownershipService.getGroupFunds(foundGroupId);
        setGroupFunds(funds);
        if (funds.length > 0) {
          setFormData(prev => ({ ...prev, selectedFundId: funds[0].id }));
        }
      }
    } catch (err) {
      console.error("Failed to load group funds:", err);
    } finally {
      setLoadingFunds(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      // Lấy userId cho walletId (giải pháp tạm thời - nên lấy từ user profile hoặc wallet service)
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("Không tìm thấy User ID. Vui lòng đăng nhập lại.");
      }

      // Sử dụng Payment Gateway nếu được chọn
      if (formData.gateway === "VNPay") {
        const orderId = `ORDER${Date.now()}`;
        const orderInfo = `Thanh toán cho cost share detail ${costShareDetailId.substring(0, 8)}`;
        
        const vnpayRequest: VNPayCreatePaymentRequest = {
          amount: amount,
          orderId: orderId,
          orderInfo: orderInfo,
          orderType: "other",
          locale: "vn",
          costShareDetailId: costShareDetailId,
          walletId: userId, // Tạm thời: sử dụng userId làm walletId
        };

        const response = await paymentService.createVNPayPayment(vnpayRequest);
        
        if (response.paymentUrl) {
          // Chuyển hướng đến VNPay
          window.location.href = response.paymentUrl;
          return;
        } else {
          throw new Error("Không thể lấy URL thanh toán VNPay");
        }
      } else if (formData.gateway === "MoMo" || formData.gateway === "ZaloPay") {
        // TODO: Triển khai cổng thanh toán MoMo và ZaloPay
        throw new Error(`Cổng thanh toán ${formData.gateway} chưa được triển khai`);
      }

      // Thanh toán thông thường
      const request: CreatePaymentRequest = {
        costShareDetailId: costShareDetailId,
        walletId: userId, // Tạm thời: sử dụng userId làm walletId
        method: formData.method,
        amount: amount,
        currency: "VND",
        callbackUrl: `${window.location.origin}/payment/callback`,
        returnUrl: `${window.location.origin}/payment/success`,
      };

      const payment = await paymentService.createPayment(request);
      
      // Nếu payment có payment URL, chuyển hướng đến đó
      if (payment.paymentUrl) {
        window.location.href = payment.paymentUrl;
        return;
      }

      // Nếu người dùng chọn sử dụng quỹ nhóm và thanh toán trực tiếp (không có gateway), trừ từ quỹ
      if (formData.useGroupFund && formData.selectedFundId && formData.gateway === "None") {
        try {
          // Tạo giao dịch chi phí trong quỹ nhóm
          const transaction = await ownershipService.createFundTransaction(formData.selectedFundId, {
            type: "Expense",
            amount: amount,
            description: `Thanh toán cho cost share detail ${costShareDetailId.substring(0, 8)}`,
            category: "Cost Share Payment",
            transactionDate: new Date().toISOString(),
          });
          
          // Tự động phê duyệt giao dịch vì thanh toán đã hoàn tất
          // Điều này sẽ trừ số tiền từ số dư quỹ
          try {
            await ownershipService.autoApproveFundTransactionForPayment(transaction.id);
          } catch (approveErr) {
            console.error("Failed to auto-approve fund transaction:", approveErr);
            // Giao dịch được tạo nhưng chưa được phê duyệt - admin có thể phê duyệt thủ công
          }
        } catch (fundErr) {
          console.error("Failed to deduct from group fund:", fundErr);
          // Không làm thất bại thanh toán nếu trừ quỹ thất bại
          // Chỉ ghi log lỗi và hiển thị cảnh báo
          setError("Thanh toán đã được tạo nhưng không thể trừ từ quỹ nhóm. Vui lòng liên hệ admin.");
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo thanh toán");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý đóng modal
  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  // Định dạng số tiền
  const formatAmount = (amount: number) => {
    return `₫${amount.toLocaleString()}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Tạo Thanh Toán
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Hoàn tất thanh toán cho cost share đã chọn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-2 pb-3">
            {error && (
              <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Số Tiền Cần Thanh Toán
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white/90">
                  {formatAmount(amount)}
                </p>
              </div>

              <div>
                <Label>
                  Phương Thức Thanh Toán <span className="text-error-500">*</span>
                </Label>
                <Select
                  value={formData.method.toString()}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      method: parseInt(value) as PaymentMethodType,
                      gateway: "None", // Đặt lại gateway khi phương thức thay đổi
                    })
                  }
                  disabled={loading}
                  required
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </Select>
              </div>

              {(formData.method === PaymentMethodType.Banking || formData.method === PaymentMethodType.EWallet) && (
                <div>
                  <Label>
                    Cổng Thanh Toán <span className="text-error-500">*</span>
                  </Label>
                  <Select
                    value={formData.gateway}
                    onChange={(value) =>
                      setFormData({ ...formData, gateway: value })
                    }
                    disabled={loading}
                    required
                  >
                    {PAYMENT_GATEWAYS.map((gateway) => (
                      <option key={gateway.value} value={gateway.value}>
                        {gateway.label}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formData.gateway === "None"
                      ? "Thanh toán sẽ được xử lý trực tiếp không qua cổng thanh toán."
                      : `Bạn sẽ được chuyển hướng đến ${formData.gateway} để hoàn tất thanh toán.`}
                  </p>
                </div>
              )}

              {/* Group Fund Option */}
              {groupFunds.length > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-500/40 dark:bg-green-500/10">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="useGroupFund"
                      checked={formData.useGroupFund}
                      onChange={(e) =>
                        setFormData({ ...formData, useGroupFund: e.target.checked })
                      }
                      disabled={loading || loadingFunds}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Label htmlFor="useGroupFund" className="cursor-pointer">
                      <span className="font-medium text-green-800 dark:text-green-300">
                        Thanh toán từ quỹ nhóm
                      </span>
                    </Label>
                  </div>
                  {formData.useGroupFund && (
                    <div className="mt-3">
                      <Label>
                        Chọn quỹ nhóm <span className="text-error-500">*</span>
                      </Label>
                      <Select
                        value={formData.selectedFundId}
                        onChange={(value) =>
                          setFormData({ ...formData, selectedFundId: value })
                        }
                        disabled={loading || loadingFunds}
                        required={formData.useGroupFund}
                      >
                        <option value="">Chọn quỹ nhóm</option>
                        {groupFunds.map((fund) => (
                          <option key={fund.id} value={fund.id}>
                            {fund.name} - Số dư: ₫{fund.balance.toLocaleString()}
                          </option>
                        ))}
                      </Select>
                      {formData.selectedFundId && (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Số dư hiện tại: ₫
                          {groupFunds.find((f) => f.id === formData.selectedFundId)?.balance.toLocaleString() || "0"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300">
                <p className="font-medium">Thông Tin Thanh Toán</p>
                <p className="mt-1 text-xs">
                  {formData.gateway !== "None"
                    ? `Bạn sẽ được chuyển hướng đến ${formData.gateway} để hoàn tất thanh toán.`
                    : formData.useGroupFund
                    ? "Thanh toán sẽ được trừ từ quỹ nhóm đã chọn."
                    : "Thanh toán sẽ được xử lý bằng phương thức đã chọn."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              type="button"
            >
              Hủy
            </Button>
            <Button size="sm" type="submit" disabled={loading}>
              {loading
                ? "Đang xử lý..."
                : formData.gateway !== "None"
                ? `Thanh toán với ${formData.gateway}`
                : "Tạo Thanh Toán"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreatePaymentModal;

