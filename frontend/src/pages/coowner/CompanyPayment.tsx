import { useState, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { paymentService } from "../../services/paymentService";

/**
 * Trang thanh toán công ty - quét mã QR hoặc giải trình các dịch vụ đã sử dụng
 */
const CompanyPayment: React.FC = () => {
  const [qrCode, setQrCode] = useState<string>("");
  const [serviceType, setServiceType] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const serviceTypes = [
    { value: "charging", label: "Phí sạc điện" },
    { value: "maintenance", label: "Bảo dưỡng" },
    { value: "cleaning", label: "Vệ sinh xe" },
    { value: "parking", label: "Gửi xe" },
    { value: "other", label: "Khác" },
  ];

  const servicesWithQR = ["charging", "parking"]; // Các dịch vụ có thể dùng QR

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedImages((prev) => [...prev, ...files]);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Validate
      if (!serviceType) {
        throw new Error("Vui lòng chọn loại dịch vụ");
      }

      if (servicesWithQR.includes(serviceType)) {
        if (!qrCode) {
          throw new Error("Vui lòng quét mã QR hoặc nhập mã QR");
        }
      } else {
        if (uploadedImages.length === 0) {
          throw new Error("Vui lòng upload hình ảnh hóa đơn/dịch vụ");
        }
        if (amount <= 0) {
          throw new Error("Vui lòng nhập số tiền");
        }
      }

      // Call API to submit payment request
      await paymentService.createCompanyPaymentRequest({
        serviceType,
        amount: servicesWithQR.includes(serviceType) ? undefined : amount,
        description,
        qrCode: servicesWithQR.includes(serviceType) ? qrCode : undefined,
        imageUrls: uploadedImages.map((file) => URL.createObjectURL(file)),
      });

      setSuccess(true);
      // Reset form
      setQrCode("");
      setServiceType("");
      setAmount(0);
      setDescription("");
      setUploadedImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Đồng sở hữu | Thanh Toán Công Ty" />
      <PageHeader
        title="Thanh Toán Công Ty"
        description="Quét mã QR hoặc giải trình các dịch vụ đã sử dụng"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* QR Code Section */}
        {servicesWithQR.includes(serviceType) && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
              Quét Mã QR
            </h3>
            <div className="space-y-4">
              <div>
                <Label>Mã QR</Label>
                <Input
                  type="text"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="Quét mã QR hoặc nhập mã QR"
                />
              </div>
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-800">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Sử dụng camera để quét mã QR
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explanation Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
            Giải Trình
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Đối với các dịch vụ không thể sử dụng mã QR thì người dùng sẽ cung cấp các hình ảnh về dịch vụ đó. Tại mục này người dùng sẽ phải thanh toán trước và công ty sẽ hoàn trả lại tiền hoặc sẽ chiết khấu vào chi phí trong phần thanh toán cá nhân.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Loại Dịch Vụ <span className="text-error-500">*</span></Label>
              <select
                className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden focus:ring-2 focus:ring-brand-300/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                required
              >
                <option value="">Chọn loại dịch vụ</option>
                {serviceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {!servicesWithQR.includes(serviceType) && serviceType && (
              <>
                <div>
                  <Label>Số Tiền (VND) <span className="text-error-500">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={amount === 0 ? "" : String(amount)}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Nhập số tiền"
                    required
                  />
                </div>

                <div>
                  <Label>Mô Tả</Label>
                  <textarea
                    className="h-24 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-hidden focus:ring-2 focus:ring-brand-300/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả dịch vụ..."
                  />
                </div>

                <div>
                  <Label>Hình Ảnh Hóa Đơn/Dịch Vụ <span className="text-error-500">*</span></Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    Upload Hình Ảnh
                  </Button>
                  {uploadedImages.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {uploadedImages.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="h-24 w-full rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {error && (
              <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200">
                Đã gửi yêu cầu thanh toán thành công! Công ty sẽ xử lý và hoàn trả trong thời gian sớm nhất.
              </div>
            )}

            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Gửi Yêu Cầu"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default CompanyPayment;

