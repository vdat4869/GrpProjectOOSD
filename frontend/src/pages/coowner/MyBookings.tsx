import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const bookings = [
  {
    id: "BK-4823",
    vehicle: "Hyundai Kona",
    date: "12 Nov 2025",
    status: "Confirmed",
  },
  {
    id: "BK-4815",
    vehicle: "Tesla Model 3",
    date: "05 Nov 2025",
    status: "Completed",
  },
  {
    id: "BK-4807",
    vehicle: "Nissan Leaf",
    date: "28 Oct 2025",
    status: "Cancelled",
  },
];

const MyBookings: React.FC = () => {
  return (
    <>
      <PageMeta title="Co-owner | My Bookings" />
      <PageHeader
        title="My Bookings"
        description="Manage upcoming trips, review history, and share access with fellow co-owners."
        actions={<Button size="sm">New Booking</Button>}
      />
      <div className="grid gap-4">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center"
          >
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{booking.id}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
                {booking.vehicle}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{booking.date}</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
              {booking.status}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

export default MyBookings;
