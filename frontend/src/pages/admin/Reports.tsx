import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const Reports: React.FC = () => {
  return (
    <>
      <PageMeta title="Admin | Reports" />
      <PageHeader
        title="Executive Reports"
        description="Generate system-wide analytics and export share-ready summaries for leadership and stakeholders."
        actions={<Button size="sm">Generate Report</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "Usage Summary",
            description: "Daily and monthly utilization metrics across all shared vehicles.",
          },
          {
            title: "Financial Health",
            description: "Revenue, expense, and outstanding balance insights from the payment service.",
          },
          {
            title: "Operational KPIs",
            description: "Staff throughput, maintenance turn-around, and SLA adherence by cohort.",
          },
        ].map(({ title, description }) => (
          <div
            key={title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
              {title}
            </h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{description}</p>
            <Button size="xs" variant="outline" className="mt-4">
              View details
            </Button>
          </div>
        ))}
      </div>
    </>
  );
};

export default Reports;
