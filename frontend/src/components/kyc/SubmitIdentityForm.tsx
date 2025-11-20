import { useState } from "react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { kycService } from "../../services/kycService";

interface SubmitIdentityFormProps {
  onSuccess?: () => void;
}

const SubmitIdentityForm: React.FC<SubmitIdentityFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    nationalIdNumber: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.nationalIdNumber || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.address) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      await kycService.submitIdentity(formData);
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit identity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
        Submit Identity Information
      </h3>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Please provide your identity information (CMND/CCCD) to start the verification process.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200">
            Identity information submitted successfully! You can now upload your license.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <Label>National ID Number (CMND/CCCD) *</Label>
            <Input
              type="text"
              value={formData.nationalIdNumber}
              onChange={(e) =>
                setFormData({ ...formData, nationalIdNumber: e.target.value })
              }
              disabled={loading}
              required
              placeholder="Enter your CMND/CCCD number"
            />
          </div>

          <div>
            <Label>Date of Birth *</Label>
            <Input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
              disabled={loading}
              required
            />
          </div>

          <div>
            <Label>First Name *</Label>
            <Input
              type="text"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              disabled={loading}
              required
            />
          </div>

          <div>
            <Label>Last Name *</Label>
            <Input
              type="text"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              disabled={loading}
              required
            />
          </div>

          <div className="lg:col-span-2">
            <Label>Address *</Label>
            <Input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              disabled={loading}
              required
              placeholder="Enter your full address"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="submit"
            size="sm"
            disabled={loading || success}
          >
            {loading ? "Submitting..." : "Submit Identity"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SubmitIdentityForm;

