import { useState } from "react";
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

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  costShareDetailId: string;
  amount: number;
}

const PAYMENT_METHODS = [
  { value: PaymentMethodType.Banking, label: "Banking" },
  { value: PaymentMethodType.EWallet, label: "E-Wallet" },
  { value: PaymentMethodType.Cash, label: "Cash" },
];

const PAYMENT_GATEWAYS = [
  { value: "VNPay", label: "VNPay" },
  { value: "MoMo", label: "MoMo" },
  { value: "ZaloPay", label: "ZaloPay" },
  { value: "None", label: "Direct Payment" },
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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      // Get userId for walletId (temporary solution - should get from user profile or wallet service)
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("User ID not found. Please login again.");
      }

      // Use Payment Gateway if selected
      if (formData.gateway === "VNPay") {
        const orderId = `ORDER${Date.now()}`;
        const orderInfo = `Payment for cost share detail ${costShareDetailId.substring(0, 8)}`;
        
        const vnpayRequest: VNPayCreatePaymentRequest = {
          amount: amount,
          orderId: orderId,
          orderInfo: orderInfo,
          orderType: "other",
          locale: "vn",
          costShareDetailId: costShareDetailId,
          walletId: userId, // Temporary: using userId as walletId
        };

        const response = await paymentService.createVNPayPayment(vnpayRequest);
        
        if (response.paymentUrl) {
          // Redirect to VNPay
          window.location.href = response.paymentUrl;
          return;
        } else {
          throw new Error("Failed to get VNPay payment URL");
        }
      } else if (formData.gateway === "MoMo" || formData.gateway === "ZaloPay") {
        // TODO: Implement MoMo and ZaloPay payment gateways
        throw new Error(`${formData.gateway} payment gateway is not yet implemented`);
      }

      // Regular payment
      const request: CreatePaymentRequest = {
        costShareDetailId: costShareDetailId,
        walletId: userId, // Temporary: using userId as walletId
        method: formData.method,
        amount: amount,
        currency: "VND",
        callbackUrl: `${window.location.origin}/payment/callback`,
        returnUrl: `${window.location.origin}/payment/success`,
      };

      const payment = await paymentService.createPayment(request);
      
      // If payment has a payment URL, redirect to it
      if (payment.paymentUrl) {
        window.location.href = payment.paymentUrl;
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  const formatAmount = (amount: number) => {
    return `₫${amount.toLocaleString()}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Create Payment
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Complete payment for the selected cost share.
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
                  Amount to Pay
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white/90">
                  {formatAmount(amount)}
                </p>
              </div>

              <div>
                <Label>
                  Payment Method <span className="text-error-500">*</span>
                </Label>
                <Select
                  value={formData.method.toString()}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      method: parseInt(value) as PaymentMethodType,
                      gateway: "None", // Reset gateway when method changes
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
                    Payment Gateway <span className="text-error-500">*</span>
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
                      ? "Payment will be processed directly without a gateway."
                      : `You will be redirected to ${formData.gateway} to complete the payment.`}
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300">
                <p className="font-medium">Payment Information</p>
                <p className="mt-1 text-xs">
                  {formData.gateway !== "None"
                    ? `You will be redirected to ${formData.gateway} to complete the payment.`
                    : "Payment will be processed using the selected method."}
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
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={loading}>
              {loading
                ? "Processing..."
                : formData.gateway !== "None"
                ? `Pay with ${formData.gateway}`
                : "Create Payment"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreatePaymentModal;

