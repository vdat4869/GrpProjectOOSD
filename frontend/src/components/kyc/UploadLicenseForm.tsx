import { useState } from "react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { kycService } from "../../services/kycService";

interface UploadLicenseFormProps {
  onSuccess?: () => void;
}

const UploadLicenseForm: React.FC<UploadLicenseFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    licenseNumber: "",
    issuedDate: "",
    expiryDate: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!file) {
      setError("Please select a license file");
      return;
    }

    if (!formData.licenseNumber || !formData.issuedDate || !formData.expiryDate) {
      setError("All fields are required");
      return;
    }

    // Check file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setError("File size must be less than 20MB");
      return;
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setError("File must be an image (JPEG, PNG) or PDF");
      return;
    }

    try {
      setLoading(true);
      await kycService.uploadLicense(file, formData);
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload license");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
        Upload Driving License
      </h3>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Upload a clear photo or scan of your driving license. Maximum file size: 20MB.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200">
            License uploaded successfully! Your KYC status will be updated shortly.
          </div>
        )}

        <div>
          <Label>License File *</Label>
          <Input
            type="file"
            onChange={handleFileChange}
            disabled={loading}
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            required
          />
          {file && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div>
            <Label>License Number *</Label>
            <Input
              type="text"
              value={formData.licenseNumber}
              onChange={(e) =>
                setFormData({ ...formData, licenseNumber: e.target.value })
              }
              disabled={loading}
              required
              placeholder="Enter license number"
            />
          </div>

          <div>
            <Label>Issued Date *</Label>
            <Input
              type="date"
              value={formData.issuedDate}
              onChange={(e) =>
                setFormData({ ...formData, issuedDate: e.target.value })
              }
              disabled={loading}
              required
            />
          </div>

          <div>
            <Label>Expiry Date *</Label>
            <Input
              type="date"
              value={formData.expiryDate}
              onChange={(e) =>
                setFormData({ ...formData, expiryDate: e.target.value })
              }
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="submit"
            size="sm"
            disabled={loading || success}
          >
            {loading ? "Uploading..." : "Upload License"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UploadLicenseForm;

