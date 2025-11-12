import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const VehicleMaintenance: React.FC = () => {
  return (
    <>
      <PageMeta title="Staff | Vehicle Maintenance" />
      <PageHeader
        title="Vehicle Maintenance"
        description="Plan preventive upkeep, record service notes, and sync completions with the report service."
        actions={<Button size="sm">Schedule Service</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
            Upcoming Services
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <li>• Battery health check for shared Tesla Model 3 (Group Aurora).</li>
            <li>• Tire rotation for Nissan Leaf (Group Velocity).</li>
            <li>• Cabin filter replacement for Hyundai Kona (Group Horizon).</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-200">
            Automation idea
          </p>
          <p className="mt-2">
            NiFi can auto-ingest vehicle telemetry and raise maintenance tickets whenever thresholds are exceeded. Feed results back to the AI service for smarter scheduling.
          </p>
        </div>
      </div>
    </>
  );
};

export default VehicleMaintenance;
