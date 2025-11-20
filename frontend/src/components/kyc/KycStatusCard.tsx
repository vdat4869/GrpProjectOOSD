import { KycStatus, KycStatusResponse } from "../../services/kycService";
import Button from "../ui/button/Button";

interface KycStatusCardProps {
  status: KycStatusResponse;
  onRefresh?: () => void;
}

const KycStatusCard: React.FC<KycStatusCardProps> = ({ status, onRefresh }) => {
  const getStatusColor = (status: KycStatus) => {
    switch (status) {
      case KycStatus.Approved:
        return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300";
      case KycStatus.Pending:
        return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
      case KycStatus.Rejected:
        return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300";
      default:
        return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
    }
  };

  const getStatusText = (status: KycStatus) => {
    switch (status) {
      case KycStatus.NotSubmitted:
        return "Not Submitted";
      case KycStatus.Pending:
        return "Pending Verification";
      case KycStatus.Approved:
        return "Approved";
      case KycStatus.Rejected:
        return "Rejected";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
          KYC Verification Status
        </h3>
        {onRefresh && (
          <Button size="sm" variant="outline" onClick={onRefresh}>
            Refresh
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Status</p>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(
              status.status
            )}`}
          >
            {getStatusText(status.status)}
          </span>
        </div>

        <div>
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Message</p>
          <p className="text-sm text-gray-900 dark:text-white/90">{status.message}</p>
        </div>

        {status.status === KycStatus.NotSubmitted && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Please submit your identity information and upload your driving license to complete KYC verification.
            </p>
          </div>
        )}

        {status.status === KycStatus.Pending && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/40 dark:bg-blue-500/10">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Your KYC documents are under review. We will notify you once the verification is complete.
            </p>
          </div>
        )}

        {status.status === KycStatus.Rejected && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/40 dark:bg-red-500/10">
            <p className="text-sm text-red-800 dark:text-red-200">
              Your KYC verification was rejected. Please check the message above and resubmit your documents.
            </p>
          </div>
        )}

        {status.status === KycStatus.Approved && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-500/40 dark:bg-green-500/10">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ Your KYC verification has been approved. You now have full access to all features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KycStatusCard;

