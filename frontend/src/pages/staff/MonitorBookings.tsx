import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const MonitorBookings: React.FC = () => {
  return (
    <>
      <PageMeta title="Staff | Monitor Bookings" />
      <PageHeader
        title="Monitor Bookings"
        description="Keep an eye on active journeys, respond to alerts, and coordinate with co-owners in real time."
        actions={<Button size="sm">View Live Map</Button>}
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
          Live Status Feed
        </h2>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Connect to RabbitMQ to stream booking status changes, then merge them with AI fairness recommendations to anticipate conflicts early.
        </p>
        <div className="mt-6 grid gap-3 text-sm text-gray-600 dark:text-gray-300">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="font-medium text-gray-800 dark:text-white/90">Booking #4821</p>
            <p>In-progress · Vehicle ID 23 · ETA 18:40</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="font-medium text-gray-800 dark:text-white/90">Booking #4820</p>
            <p>Awaiting check-in · Notify co-owner about parking instructions.</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="font-medium text-gray-800 dark:text-white/90">Booking #4818</p>
            <p>Completed · Awaiting payment confirmation.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default MonitorBookings;
