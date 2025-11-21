import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";

interface PaymentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompany: () => void;
  onSelectPersonal: () => void;
}

const PaymentTypeModal: React.FC<PaymentTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectCompany,
  onSelectPersonal,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px] m-4"
    >
      <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Chọn Phương Thức Thanh Toán
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Vui lòng chọn phương thức thanh toán phù hợp với bạn
          </p>
        </div>

        <div className="px-2 space-y-4">
          {/* Company Payment Option */}
          <div
            onClick={onSelectCompany}
            className="cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-6 transition-all hover:border-brand-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Thanh Toán Công Ty
              </h5>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Khi người dùng sử dụng xe và sử dụng các dịch vụ có tính phí như phí sạc điện, bảo dưỡng, vệ sinh xe,… thì công ty sẽ đứng ra trả trước.
            </p>
          </div>

          {/* Personal Payment Option */}
          <div
            onClick={onSelectPersonal}
            className="cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-6 transition-all hover:border-brand-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-500/20">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Thanh Toán Cá Nhân
              </h5>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Người dùng thanh toán các khoản phí khi sử dụng xe.
            </p>
          </div>

          {/* Note */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Lưu ý:</strong> Các khoản phí như bảo hiểm, đăng kiểm sẽ do công ty chi trả.
            </p>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Với từng loại nhu cầu sử dụng sẽ có những mức phí khác nhau.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={onClose}
            >
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentTypeModal;

