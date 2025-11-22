import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import {
  paymentService,
  PaymentMethod,
  PaymentMethodType,
} from "../../services/paymentService";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";

/**
 * Trang quản lý phương thức thanh toán - thêm, sửa, xóa các phương thức thanh toán
 */
const PaymentMethods: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    methodType: PaymentMethodType.Banking.toString(),
    accountNumber: "",
    accountName: "",
    bankName: "",
    bankCode: "",
    isDefault: false,
  });

  /**
   * Tải danh sách phương thức thanh toán khi component mount
   */
  useEffect(() => {
    loadPaymentMethods();
  }, []);

  /**
   * Tải danh sách phương thức thanh toán của user
   */
  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        setError("Không tìm thấy User ID. Vui lòng đăng nhập lại.");
        return;
      }
      const data = await paymentService.getPaymentMethodsByUser(userId);
      setPaymentMethods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải phương thức thanh toán");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      methodType: PaymentMethodType.Banking.toString(),
      accountNumber: "",
      accountName: "",
      bankName: "",
      bankCode: "",
      isDefault: false,
    });
    setIsCreateModalOpen(true);
  };

  const handleEdit = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setFormData({
      methodType: method.methodType.toString(),
      accountNumber: method.accountNumber || "",
      accountName: method.accountName || "",
      bankName: method.bankName || "",
      bankCode: method.bankCode || "",
      isDefault: method.isDefault,
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setError(null);
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        setError("User ID not found. Please login again.");
        return;
      }

      if (isCreateModalOpen) {
        // Convert enum value to string
        const methodTypeString = formData.methodType === PaymentMethodType.Banking.toString()
          ? "Banking"
          : formData.methodType === PaymentMethodType.EWallet.toString()
          ? "EWallet"
          : "Cash";
        
        await paymentService.createPaymentMethod({
          userId,
          methodType: methodTypeString,
          accountNumber: formData.accountNumber || undefined,
          accountName: formData.accountName || undefined,
          bankName: formData.bankName || undefined,
          bankCode: formData.bankCode || undefined,
          isDefault: formData.isDefault,
        });
      } else if (selectedMethod) {
        await paymentService.updatePaymentMethod(selectedMethod.id, {
          accountName: formData.accountName || undefined,
          bankName: formData.bankName || undefined,
          bankCode: formData.bankCode || undefined,
          isDefault: formData.isDefault,
        });
      }

      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedMethod(null);
      loadPaymentMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu phương thức thanh toán");
    }
  };

  /**
   * Xóa phương thức thanh toán
   * @param id - ID của phương thức thanh toán cần xóa
   */
  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phương thức thanh toán này?")) return;
    try {
      await paymentService.deletePaymentMethod(id);
      loadPaymentMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa phương thức thanh toán");
    }
  };

  /**
   * Lấy nhãn loại phương thức thanh toán (tiếng Việt)
   * @param type - Loại phương thức thanh toán
   * @returns Nhãn loại phương thức
   */
  const getMethodTypeLabel = (type: string) => {
    switch (type) {
      case "Banking":
      case PaymentMethodType.Banking.toString():
        return "Ngân hàng";
      case "EWallet":
      case "E-Wallet":
      case PaymentMethodType.EWallet.toString():
        return "Ví điện tử";
      case "Cash":
      case PaymentMethodType.Cash.toString():
        return "Tiền mặt";
      default:
        return type || "Không xác định";
    }
  };

  return (
    <>
      <PageMeta title="Đồng sở hữu | Phương Thức Thanh Toán" />
      <PageHeader
        title="Phương Thức Thanh Toán"
        description="Quản lý các phương thức thanh toán của bạn (Banking, E-Wallet)"
        actions={
          <Button size="sm" onClick={handleCreate}>
            Thêm Phương Thức
          </Button>
        }
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Đang tải phương thức thanh toán...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {paymentMethods.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">
                Bạn chưa có phương thức thanh toán nào. Hãy thêm một phương thức để bắt đầu.
              </p>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div
                key={method.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getMethodTypeLabel(method.methodType)}
                      </h3>
                      {method.isDefault && (
                        <span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800 dark:bg-primary-500/20 dark:text-primary-200">
                          Mặc định
                        </span>
                      )}
                      {!method.isActive && (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Không hoạt động
                        </span>
                      )}
                    </div>
                    {method.accountNumber && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Số tài khoản: {method.accountNumber}
                      </p>
                    )}
                    {method.accountName && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Tên tài khoản: {method.accountName}
                      </p>
                    )}
                    {method.bankName && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Ngân hàng: {method.bankName}
                      </p>
                    )}
                    {method.bankCode && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Mã ngân hàng: {method.bankCode}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(method)}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(method.id)}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      >
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Thêm Phương Thức Thanh Toán
          </h2>
          <div className="space-y-4">
          <div>
            <Label htmlFor="methodType">Loại phương thức *</Label>
            <Select
              value={formData.methodType}
              onChange={(value) => setFormData({ ...formData, methodType: value })}
            >
              <option value={PaymentMethodType.Banking.toString()}>Banking</option>
              <option value={PaymentMethodType.EWallet.toString()}>E-Wallet</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="accountNumber">Số tài khoản</Label>
            <Input
              id="accountNumber"
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="Nhập số tài khoản"
            />
          </div>
          <div>
            <Label htmlFor="accountName">Tên tài khoản</Label>
            <Input
              id="accountName"
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              placeholder="Nhập tên tài khoản"
            />
          </div>
          <div>
            <Label htmlFor="bankName">Tên ngân hàng</Label>
            <Input
              id="bankName"
              type="text"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="Nhập tên ngân hàng"
            />
          </div>
          <div>
            <Label htmlFor="bankCode">Mã ngân hàng</Label>
            <Input
              id="bankCode"
              type="text"
              value={formData.bankCode}
              onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
              placeholder="Nhập mã ngân hàng"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <Label htmlFor="isDefault" className="mb-0">
              Đặt làm phương thức mặc định
            </Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleSave}>Lưu</Button>
          </div>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedMethod(null);
        }}
      >
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Sửa Phương Thức Thanh Toán
          </h2>
          <div className="space-y-4">
          <div>
            <Label htmlFor="editAccountName">Tên tài khoản</Label>
            <Input
              id="editAccountName"
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              placeholder="Nhập tên tài khoản"
            />
          </div>
          <div>
            <Label htmlFor="editBankName">Tên ngân hàng</Label>
            <Input
              id="editBankName"
              type="text"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="Nhập tên ngân hàng"
            />
          </div>
          <div>
            <Label htmlFor="editBankCode">Mã ngân hàng</Label>
            <Input
              id="editBankCode"
              type="text"
              value={formData.bankCode}
              onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
              placeholder="Nhập mã ngân hàng"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editIsDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <Label htmlFor="editIsDefault" className="mb-0">
              Đặt làm phương thức mặc định
            </Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedMethod(null);
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleSave}>Lưu</Button>
          </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PaymentMethods;

