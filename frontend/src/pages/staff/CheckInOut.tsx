import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const CheckInOut: React.FC = () => {
  return (
    <>
      <PageMeta title="Staff | Check-In / Check-Out" />
      <PageHeader
        title="Check-In / Check-Out"
        description="Validate booking QR codes, confirm vehicle condition, and capture digital signatures on-site."
        actions={<Button size="sm">Scan QR Code</Button>}
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
          Workflow tips
        </h2>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Integrate with the booking service to fetch upcoming reservations, and push check-in outcomes back through RabbitMQ for analytics.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>• Pre-check vehicle availability 30 minutes before scheduled start.</li>
          <li>• Capture condition photos and attach to the booking record.</li>
          <li>• Trigger automatic payment release on successful check-out.</li>
        </ul>
      </div>
    </>
  );
};

export default CheckInOut;
