import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom"; // Reserved for future use
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, Proposal, VehicleGroup } from "../../services/ownershipService";
import CreateProposalModal from "../../components/modals/CreateProposalModal";
import VoteModal from "../../components/modals/VoteModal";
import ProposalDetailModal from "../../components/modals/ProposalDetailModal";

const GroupVoting: React.FC = () => {
  // const _navigate = useNavigate(); // Reserved for future use
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId || groups.length > 0) {
      const groupId = selectedGroupId || groups[0]?.id;
      if (groupId) {
        loadProposals(groupId);
      }
    }
  }, [selectedGroupId, groups]);

  const loadGroups = async () => {
    try {
      const data = await ownershipService.getGroups();
      setGroups(data);
      if (data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  };

  const loadProposals = async (groupId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await ownershipService.getProposals(groupId);
      setProposals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "voting" || statusLower === "open") {
      return "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300";
    }
    if (statusLower === "approved") {
      return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300";
    }
    if (statusLower === "rejected") {
      return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300";
    }
    if (statusLower === "pending") {
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
    }
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  };

  const canVote = (proposal: Proposal) => {
    return proposal.status.toLowerCase() === "voting";
  };

  // const _canStartVoting = (proposal: Proposal) => {
  //   return proposal.status.toLowerCase() === "pending";
  // }; // Reserved for future use

  const handleVote = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowVoteModal(true);
  };

  const handleViewDetails = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowDetailModal(true);
  };

  return (
    <>
      <PageMeta title="Co-owner | Group Voting" />
      <PageHeader
        title="Group Voting"
        description="Participate in proposals that shape vehicle upgrades, cost sharing, and policy changes."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            Create Proposal
          </Button>
        }
      />

      {groups.length > 0 && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Vehicle Group
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-400 dark:focus:ring-brand-400"
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} - {group.vehicleName}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading proposals...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 shadow-theme-xs dark:border-error-500/40 dark:bg-error-500/10">
          <p className="text-error-600 dark:text-error-200">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {proposals.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">
                No proposals found. Create one to get started!
              </p>
            </div>
          ) : (
            proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {proposal.id.substring(0, 8)}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                          proposal.status
                        )}`}
                      >
                        {proposal.status}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      {proposal.title}
                    </p>
                    {proposal.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {proposal.description}
                      </p>
                    )}
                    {proposal.estimatedCost && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Estimated Cost: {proposal.currency || "VND"}{" "}
                        {proposal.estimatedCost.toLocaleString()}
                      </p>
                    )}
                    {proposal.votingEndDate && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Closes: {formatDate(proposal.votingEndDate)}
                      </p>
                    )}
                    {proposal.totalVotes !== undefined && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Votes: {proposal.totalVotes} (
                        {proposal.approveVotes || 0} Approve, {proposal.rejectVotes || 0} Reject,{" "}
                        {proposal.abstainVotes || 0} Abstain)
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col">
                    {canVote(proposal) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVote(proposal)}
                      >
                        Vote
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(proposal)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <CreateProposalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          if (selectedGroupId) {
            loadProposals(selectedGroupId);
          }
        }}
        groupId={selectedGroupId}
      />

      {selectedProposal && (
        <>
          <VoteModal
            isOpen={showVoteModal}
            onClose={() => {
              setShowVoteModal(false);
              setSelectedProposal(null);
            }}
            onSuccess={() => {
              if (selectedGroupId) {
                loadProposals(selectedGroupId);
              }
            }}
            proposal={selectedProposal}
          />

          <ProposalDetailModal
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedProposal(null);
            }}
            onSuccess={() => {
              if (selectedGroupId) {
                loadProposals(selectedGroupId);
              }
            }}
            proposal={selectedProposal}
          />
        </>
      )}
    </>
  );
};

export default GroupVoting;
