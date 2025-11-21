import { useState, FormEvent } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";

export type BookingNeedType = "NH" | "DH" | "LD"; // Ngắn hạn, Dài hạn, Lâu dài

interface BookingNeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (needType: BookingNeedType, duration: number) => void;
}

const BookingNeedModal: React.FC<BookingNeedModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [needType, setNeedType] = useState<BookingNeedType | "">("");
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!needType) {
      setError("Vui lòng chọn loại nhu cầu");
      return;
    }

    if (needType === "NH" || needType === "DH") {
      if (duration <= 0) {
        setError("Vui lòng nhập thời gian sử dụng");
        return;
      }

      if (needType === "NH" && duration > 180) {
        setError("Ngắn hạn giới hạn tối đa 180 ngày (6 tháng)");
        return;
      }

      if (needType === "DH" && duration > 60) {
        setError("Dài hạn giới hạn tối đa 60 tháng (5 năm)");
        return;
      }
    }

    onSelect(needType as BookingNeedType, duration);
    // Reset form
    setNeedType("");
    setDuration(0);
    setError(null);
  };

  const getMaxDuration = () => {
    if (needType === "NH") return 180; // 6 tháng = 180 ngày
    if (needType === "DH") return 60; // 5 năm = 60 tháng
    return 0;
  };

  const getDurationLabel = () => {
    if (needType === "NH") return "Số ngày sử dụng";
    if (needType === "DH") return "Số tháng sử dụng";
    return "";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[500px] m-4"
    >
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Chọn Nhu Cầu Sử Dụng
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Vui lòng chọn loại nhu cầu sử dụng xe của bạn
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-2 space-y-4">
            <div>
              <Label>Loại Nhu Cầu <span className="text-error-500">*</span></Label>
              <Select
                value={needType}
                onChange={(value) => {
                  setNeedType(value as BookingNeedType);
                  setDuration(0);
                  setError(null);
                }}
              >
                <option value="">Chọn loại nhu cầu</option>
                <option value="NH">Ngắn hạn (NH) - Tối đa 6 tháng</option>
                <option value="DH">Dài hạn (DH) - Tối đa 5 năm</option>
                <option value="LD">Lâu dài (LD) - Không giới hạn</option>
              </Select>
              {needType === "NH" && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Ngắn hạn: Nhiều người đồng sở hữu, hạn chế xe do nhu cầu cao
                </p>
              )}
              {needType === "DH" && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Dài hạn: 2-3 người đồng sở hữu, số lượng xe tương đối
                </p>
              )}
              {needType === "LD" && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Lâu dài: 2 người sở hữu (1 người dùng + công ty 10%), phù hợp người muốn mua xe nhưng không đủ tài chính
                </p>
              )}
            </div>

            {(needType === "NH" || needType === "DH") && (
              <div>
                <Label>
                  {getDurationLabel()} <span className="text-error-500">*</span>
                  <span className="ml-2 text-xs text-gray-500">
                    (Tối đa: {getMaxDuration()} {needType === "NH" ? "ngày" : "tháng"})
                  </span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={getMaxDuration().toString()}
                  value={duration || ""}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  placeholder={`Nhập số ${needType === "NH" ? "ngày" : "tháng"}`}
                />
              </div>
            )}

            {needType === "LD" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/40 dark:bg-blue-500/10">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Lâu dài không có giới hạn thời gian. Thời gian phụ thuộc vào người sử dụng và các điều khoản trong hợp đồng thỏa thuận đi kèm.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-500/40 dark:bg-error-500/10">
                <p className="text-sm text-error-600 dark:text-error-200">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3 lg:justify-end mt-6">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={onClose}
              >
                Hủy
              </Button>
              <Button size="sm" type="submit">
                Xác Nhận
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default BookingNeedModal;

