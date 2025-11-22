import { useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { paymentService, CostShare } from "../../services/paymentService";

interface DeleteCostShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  costShare: CostShare | null;
  onSuccess: () => void;
}

export default function DeleteCostShareModal({
  isOpen,
  onClose,
  costShare,
  onSuccess,
}: DeleteCostShareModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!costShare) return;

    try {
      setLoading(true);
      setError(null);
      const success = await paymentService.deleteCostShare(costShare.id);
      if (success) {
        onSuccess();
        onClose();
      } else {
        setError("Failed to delete cost share");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete cost share");
    } finally {
      setLoading(false);
    }
  };

  if (!costShare) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Delete Cost Share
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            This action cannot be undone.
          </p>
        </div>
        <div className="px-2 space-y-4">
        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-500/40 dark:bg-error-500/10">
            <p className="text-sm text-error-600 dark:text-error-200">{error}</p>
          </div>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete this cost share? This action cannot be undone.
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/30">
          <p className="text-sm font-semibold text-gray-900 dark:text-white/90">{costShare.title}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Amount: ₫{costShare.totalAmount.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-3 lg:justify-end mt-6">
          <Button size="sm" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={loading}
            className="border-error-300 text-error-600 hover:bg-error-50 dark:border-error-500/40 dark:text-error-400 dark:hover:bg-error-500/10"
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
        </div>
      </div>
    </Modal>
  );
}

