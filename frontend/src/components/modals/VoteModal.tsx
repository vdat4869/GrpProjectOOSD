import { useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import { ownershipService, Proposal } from "../../services/ownershipService";

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proposal: Proposal;
}

const VoteModal: React.FC<VoteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  proposal,
}) => {
  const [choice, setChoice] = useState<"Approve" | "Reject" | "Abstain" | "">("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Xử lý submit form bỏ phiếu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!choice) {
      setError("Vui lòng chọn lựa chọn bỏ phiếu");
      return;
    }

    try {
      setLoading(true);
      await ownershipService.voteOnProposal(proposal.id, choice, comment || undefined);
      onSuccess();
      onClose();
      // Đặt lại form
      setChoice("");
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi phiếu bầu");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý đóng modal
  const handleClose = () => {
    if (!loading) {
      setError(null);
      setChoice("");
      setComment("");
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Bỏ Phiếu Cho Đề Xuất
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            {proposal.title}
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
              <div>
                <Label>
                  Phiếu Bầu Của Bạn <span className="text-error-500">*</span>
                </Label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                    <input
                      type="radio"
                      name="vote"
                      value="Approve"
                      checked={choice === "Approve"}
                      onChange={(e) => setChoice(e.target.value as "Approve")}
                      disabled={loading}
                      className="text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Đồng ý
                    </span>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                    <input
                      type="radio"
                      name="vote"
                      value="Reject"
                      checked={choice === "Reject"}
                      onChange={(e) => setChoice(e.target.value as "Reject")}
                      disabled={loading}
                      className="text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Từ chối
                    </span>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                    <input
                      type="radio"
                      name="vote"
                      value="Abstain"
                      checked={choice === "Abstain"}
                      onChange={(e) => setChoice(e.target.value as "Abstain")}
                      disabled={loading}
                      className="text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Trung lập
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <Label>Bình Luận (Tùy chọn)</Label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={loading}
                  rows={3}
                  placeholder="Thêm bình luận cho phiếu bầu của bạn"
                />
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
            <Button size="sm" type="submit" disabled={loading || !choice}>
              {loading ? "Đang gửi..." : "Gửi Phiếu Bầu"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default VoteModal;

