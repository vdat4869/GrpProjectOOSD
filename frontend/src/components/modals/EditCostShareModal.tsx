import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { paymentService, CostShare, UpdateCostShareRequest } from "../../services/paymentService";

interface EditCostShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  costShare: CostShare | null;
  onSuccess: () => void;
}

export default function EditCostShareModal({
  isOpen,
  onClose,
  costShare,
  onSuccess,
}: EditCostShareModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    totalAmount: 0,
    dueDate: "",
    receiptUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && costShare) {
      setFormData({
        title: costShare.title || "",
        description: costShare.description || "",
        totalAmount: costShare.totalAmount || 0,
        dueDate: costShare.dueDate ? new Date(costShare.dueDate).toISOString().split("T")[0] : "",
        receiptUrl: costShare.receiptUrl || "",
      });
      setError(null);
    }
  }, [isOpen, costShare]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costShare) return;

    try {
      setLoading(true);
      setError(null);

      const updateData: UpdateCostShareRequest = {
        title: formData.title || undefined,
        description: formData.description || undefined,
        totalAmount: formData.totalAmount > 0 ? formData.totalAmount : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        receiptUrl: formData.receiptUrl || undefined,
      };

      await paymentService.updateCostShare(costShare.id, updateData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update cost share");
    } finally {
      setLoading(false);
    }
  };

  if (!costShare) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] m-4">
      <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Cost Share
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Update cost share information.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-2 space-y-4">
        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-500/40 dark:bg-error-500/10">
            <p className="text-sm text-error-600 dark:text-error-200">{error}</p>
          </div>
        )}

        <div>
          <Label>Title *</Label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Cost share title"
          />
        </div>

        <div>
          <Label>Description</Label>
          <textarea
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Cost share description"
          />
        </div>

        <div>
          <Label>Total Amount *</Label>
          <Input
            type="number"
            value={formData.totalAmount}
            onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
            required
            min="0"
            step="0.01"
            placeholder="0"
          />
        </div>

        <div>
          <Label>Due Date *</Label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>Receipt URL</Label>
          <Input
            type="url"
            value={formData.receiptUrl}
            onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="flex items-center gap-3 lg:justify-end mt-6">
          <Button size="sm" variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
      </div>
    </Modal>
  );
}

