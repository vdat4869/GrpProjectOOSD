import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { ownershipService, Proposal, Vote } from "../../services/ownershipService";
import VoteModal from "./VoteModal";

interface ProposalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proposal: Proposal;
}

const ProposalDetailModal: React.FC<ProposalDetailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  proposal,
}) => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [proposalDetail, setProposalDetail] = useState<Proposal | null>(null);

  useEffect(() => {
    if (isOpen && proposal) {
      loadProposalDetail();
      loadVotes();
    }
  }, [isOpen, proposal]);

  const loadProposalDetail = async () => {
    try {
      const detail = await ownershipService.getProposalById(proposal.id);
      if (detail) {
        setProposalDetail(detail);
      }
    } catch (err) {
      console.error("Failed to load proposal detail:", err);
    }
  };

  const loadVotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ownershipService.getVotes(proposal.id);
      setVotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load votes");
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

  const getVoteColor = (choice: string) => {
    switch (choice.toLowerCase()) {
      case "approve":
        return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300";
      case "reject":
        return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300";
      case "abstain":
        return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
      default:
        return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300";
    }
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

  const canVote = proposal.status.toLowerCase() === "voting";

  const displayProposal = proposalDetail || proposal;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-[800px] m-4">
        <div className="no-scrollbar relative w-full max-w-[800px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Proposal Details
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              {displayProposal.title}
            </p>
          </div>

          <div className="custom-scrollbar max-h-[600px] overflow-y-auto px-2 pb-3">
            {/* Proposal Info */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                    displayProposal.status
                  )}`}
                >
                  {displayProposal.status}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {displayProposal.id.substring(0, 8)}
                </span>
              </div>

              <div>
                <h5 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Type
                </h5>
                <p className="text-sm text-gray-900 dark:text-white/90">
                  {displayProposal.type}
                </p>
              </div>

              {displayProposal.description && (
                <div>
                  <h5 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Description
                  </h5>
                  <p className="text-sm text-gray-900 dark:text-white/90">
                    {displayProposal.description}
                  </p>
                </div>
              )}

              {displayProposal.details && (
                <div>
                  <h5 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Details
                  </h5>
                  <p className="text-sm text-gray-900 dark:text-white/90">
                    {displayProposal.details}
                  </p>
                </div>
              )}

              {displayProposal.estimatedCost && (
                <div>
                  <h5 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Estimated Cost
                  </h5>
                  <p className="text-sm text-gray-900 dark:text-white/90">
                    {displayProposal.currency || "VND"}{" "}
                    {displayProposal.estimatedCost.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Created At
                  </h5>
                  <p className="text-sm text-gray-900 dark:text-white/90">
                    {formatDate(displayProposal.createdAt)}
                  </p>
                </div>
                {displayProposal.votingStartDate && (
                  <div>
                    <h5 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Voting Start
                    </h5>
                    <p className="text-sm text-gray-900 dark:text-white/90">
                      {formatDate(displayProposal.votingStartDate)}
                    </p>
                  </div>
                )}
                {displayProposal.votingEndDate && (
                  <div>
                    <h5 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Voting End
                    </h5>
                    <p className="text-sm text-gray-900 dark:text-white/90">
                      {formatDate(displayProposal.votingEndDate)}
                    </p>
                  </div>
                )}
              </div>

              {/* Vote Summary */}
              {(displayProposal.totalVotes !== undefined ||
                displayProposal.totalVotes !== 0) && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <h5 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Vote Summary
                  </h5>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
                        {displayProposal.totalVotes || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Approve</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {displayProposal.approveVotes || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Reject</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {displayProposal.rejectVotes || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Abstain</p>
                      <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                        {displayProposal.abstainVotes || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Votes List */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Votes ({votes.length})
                </h5>
                {canVote && (
                  <Button
                    size="sm"
                    onClick={() => setShowVoteModal(true)}
                  >
                    Vote Now
                  </Button>
                )}
              </div>

              {loading && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading votes...</p>
              )}

              {error && (
                <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <div className="space-y-3">
                  {votes.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No votes yet. Be the first to vote!
                    </p>
                  ) : (
                    votes.map((vote) => (
                      <div
                        key={vote.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${getVoteColor(
                                  vote.choice
                                )}`}
                              >
                                {vote.choice}
                              </span>
                              <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                                {vote.coOwnerName}
                              </p>
                            </div>
                            {vote.comment && (
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {vote.comment}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(vote.votedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {proposal && (
        <VoteModal
          isOpen={showVoteModal}
          onClose={() => {
            setShowVoteModal(false);
          }}
          onSuccess={() => {
            loadVotes();
            loadProposalDetail();
            onSuccess();
          }}
          proposal={proposal}
        />
      )}
    </>
  );
};

export default ProposalDetailModal;

