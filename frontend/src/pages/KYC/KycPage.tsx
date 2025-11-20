import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import { kycService, KycStatus, KycStatusResponse } from "../../services/kycService";
import SubmitIdentityForm from "../../components/kyc/SubmitIdentityForm";
import UploadLicenseForm from "../../components/kyc/UploadLicenseForm";
import KycStatusCard from "../../components/kyc/KycStatusCard";

const KycPage: React.FC = () => {
  const [kycStatus, setKycStatus] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"identity" | "license" | "status">("status");

  useEffect(() => {
    loadKycStatus();
  }, []);

  const loadKycStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await kycService.getKycStatus();
      setKycStatus(status);
      
      // Auto-select tab based on status
      if (status.status === KycStatus.NotSubmitted) {
        setActiveTab("identity");
      } else if (status.status === KycStatus.Pending) {
        setActiveTab("status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KYC status");
    } finally {
      setLoading(false);
    }
  };

  const handleIdentitySubmitted = () => {
    loadKycStatus();
    setActiveTab("license");
  };

  const handleLicenseUploaded = () => {
    loadKycStatus();
    setActiveTab("status");
  };

  return (
    <>
      <PageMeta title="KYC Verification | EV Co-ownership" />
      <PageHeader
        title="KYC Verification"
        description="Complete your identity verification to access all features."
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading KYC status...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab("identity")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "identity"
                  ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-300"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Submit Identity
            </button>
            <button
              onClick={() => setActiveTab("license")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "license"
                  ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-300"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Upload License
            </button>
            <button
              onClick={() => setActiveTab("status")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "status"
                  ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-300"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Status
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "identity" && (
            <SubmitIdentityForm onSuccess={handleIdentitySubmitted} />
          )}

          {activeTab === "license" && (
            <UploadLicenseForm onSuccess={handleLicenseUploaded} />
          )}

          {activeTab === "status" && kycStatus && (
            <KycStatusCard status={kycStatus} onRefresh={loadKycStatus} />
          )}
        </div>
      )}
    </>
  );
};

export default KycPage;

