import { QRCodeSVG } from "qrcode.react";

interface OwnerCodeDisplayProps {
  ownerCode: string;
  vehicleName?: string;
  vehicleModel?: string;
  battery?: number;
  range?: number;
  location?: string;
  status?: string;
}

const OwnerCodeDisplay: React.FC<OwnerCodeDisplayProps> = ({
  ownerCode,
  vehicleName,
  vehicleModel,
  battery,
  range,
  location,
  status = "Available",
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
          {vehicleName || "Vehicle"}
        </h3>
        {vehicleModel && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Model: {vehicleModel}</p>
        )}
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
          <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {status}
          </span>
        </div>

        {battery !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Battery:</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{battery}%</span>
          </div>
        )}

        {range !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Range:</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{range} miles</span>
          </div>
        )}

        {location && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Location:</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{location}</span>
          </div>
        )}
      </div>

      {/* QR Code */}
      <div className="mb-4 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <QRCodeSVG
          value={ownerCode}
          size={200}
          level="M"
          includeMargin={true}
          className="rounded-lg"
        />
      </div>

      {/* Owner Code */}
      <div className="text-center">
        <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
          Your Ownership Code:
        </p>
        <p className="text-lg font-mono font-semibold text-gray-900 dark:text-white/90">
          {ownerCode}
        </p>
      </div>
    </div>
  );
};

export default OwnerCodeDisplay;

