import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";

const proposals = [
  {
    id: "PR-109",
    title: "Upgrade to fast charger",
    status: "Open",
    closes: "15 Nov 2025",
  },
  {
    id: "PR-101",
    title: "Adjust monthly contribution",
    status: "Closed",
    closes: "28 Oct 2025",
  },
];

const GroupVoting: React.FC = () => {
  return (
    <>
      <PageMeta title="Co-owner | Group Voting" />
      <PageHeader
        title="Group Voting"
        description="Participate in proposals that shape vehicle upgrades, cost sharing, and policy changes."
        actions={<Button size="sm">Create Proposal</Button>}
      />
      <div className="grid gap-4">
        {proposals.map((proposal) => (
          <div
            key={proposal.id}
            className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center"
          >
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{proposal.id}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
                {proposal.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Closes: {proposal.closes}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                proposal.status === "Open"
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {proposal.status}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

export default GroupVoting;
