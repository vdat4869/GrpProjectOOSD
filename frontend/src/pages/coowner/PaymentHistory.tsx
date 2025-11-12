import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";

const payments = [
  {
    id: "PM-2041",
    description: "Charging session split",
    amount: "₫320,000",
    status: "Settled",
    date: "08 Nov 2025",
  },
  {
    id: "PM-2032",
    description: "Routine maintenance",
    amount: "₫1,200,000",
    status: "Pending",
    date: "31 Oct 2025",
  },
  {
    id: "PM-2010",
    description: "Insurance renewal",
    amount: "₫2,450,000",
    status: "Settled",
    date: "15 Sep 2025",
  },
];

const PaymentHistory: React.FC = () => {
  return (
    <>
      <PageMeta title="Co-owner | Payment History" />
      <PageHeader
        title="Payment History"
        description="Review your contributions and settlement status across every shared expense."
      />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/30">
            <tr className="text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
              <th className="px-6 py-4">Reference</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white/90">
                  {payment.id}
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                  {payment.description}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                  {payment.date}
                </td>
                <td className="px-6 py-4 text-gray-900 dark:text-white/90">
                  {payment.amount}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      payment.status === "Settled"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
                    }`}
                  >
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PaymentHistory;
