import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom"; // Reserved for future use
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/button/Button";
import { ownershipService, Proposal, VehicleGroup, Vote } from "../../services/ownershipService";
import CreateProposalModal from "../../components/modals/CreateProposalModal";
import VoteModal from "../../components/modals/VoteModal";
import ProposalDetailModal from "../../components/modals/ProposalDetailModal";

/**
 * Trang biểu quyết nhóm - tham gia các đề xuất về nâng cấp xe, chia sẻ chi phí, thay đổi chính sách
 */
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
  const [userVotes, setUserVotes] = useState<Map<string, Vote>>(new Map()); // proposalId -> user's vote
  const [currentCoOwnerId, setCurrentCoOwnerId] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
    loadCurrentCoOwner();
  }, []);

  useEffect(() => {
    if (selectedGroupId || groups.length > 0) {
      const groupId = selectedGroupId || groups[0]?.id;
      if (groupId) {
        loadProposals(groupId);
      }
    }
  }, [selectedGroupId, groups]);

  const loadCurrentCoOwner = async () => {
    try {
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) return;

      const coOwners = await ownershipService.getCoOwners();
      const currentCoOwner = coOwners.find(co => co.userId === userId);
      if (currentCoOwner) {
        setCurrentCoOwnerId(currentCoOwner.id);
      }
    } catch (err) {
      console.error("Không thể tải co-owner hiện tại:", err);
    }
  };

  const loadGroups = async () => {
    try {
      // Lấy co-owner hiện tại
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        console.error("Không tìm thấy user. Vui lòng đăng nhập lại.");
        return;
      }
      
      const coOwner = await ownershipService.getCoOwnerByUserId(userId);
      if (!coOwner) {
        console.error("Tài khoản chưa được đăng ký làm co-owner.");
        return;
      }
      
      // Lấy tất cả quyền sở hữu của co-owner (chỉ active)
      const allOwnerships = await ownershipService.getOwnerships(undefined, coOwner.id, true);
      
      // Lấy danh sách group IDs từ ownerships
      const groupIds = [...new Set(allOwnerships.map(o => o.vehicleGroupId))];
      
      // Lấy tất cả groups và lọc chỉ những groups mà co-owner có quyền
      const allGroups = await ownershipService.getGroups();
      const userGroups = allGroups.filter(g => groupIds.includes(g.id));
      
      setGroups(userGroups);
      if (userGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(userGroups[0].id);
      }
    } catch (err) {
      console.error("Không thể tải nhóm:", err);
    }
  };

  const loadProposals = async (groupId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await ownershipService.getProposals(groupId);
      
      // Log votingEndDate for debugging
      if (data && data.length > 0) {
        data.forEach(p => {
          console.log(`[GroupVoting] Proposal ${p.id}: votingEndDate = ${p.votingEndDate}`);
        });
      }
      
      setProposals(data || []);
      
      // Ensure currentCoOwnerId is loaded before loading votes
      if (!currentCoOwnerId) {
        await loadCurrentCoOwner();
      }
      
      // Load votes for all proposals to check if user has voted
      if (currentCoOwnerId && data && data.length > 0) {
        await loadUserVotes(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Không thể tải đề xuất";
      setError(errorMessage);
      console.error("Error loading proposals:", err);
      // Don't clear proposals on error, keep existing data
    } finally {
      setLoading(false);
    }
  };

  const loadUserVotes = async (proposals: Proposal[]) => {
    // Get currentCoOwnerId from state or load it
    let coOwnerId = currentCoOwnerId;
    if (!coOwnerId) {
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (userId) {
        try {
          const coOwners = await ownershipService.getCoOwners();
          const currentCoOwner = coOwners.find(co => co.userId === userId);
          if (currentCoOwner) {
            coOwnerId = currentCoOwner.id;
            setCurrentCoOwnerId(coOwnerId);
          }
        } catch (err) {
          console.error("Không thể tải co-owner để biểu quyết:", err);
          return;
        }
      } else {
        return;
      }
    }

    if (!coOwnerId) return;

    const votesMap = new Map<string, Vote>();
    
    // Load votes for each proposal in parallel
    const votePromises = proposals.map(async (proposal) => {
      try {
        const votes = await ownershipService.getVotes(proposal.id);
        const userVote = votes.find(v => v.coOwnerId === coOwnerId);
        if (userVote) {
          votesMap.set(proposal.id, userVote);
        }
      } catch (err) {
        console.error(`Không thể tải phiếu bầu cho đề xuất ${proposal.id}:`, err);
      }
    });

    await Promise.all(votePromises);
    setUserVotes(votesMap);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      // Parse date string and ensure consistent formatting
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      
      // Format consistently using Vietnam timezone
      return date.toLocaleDateString("vi-VN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      });
    } catch (err) {
      console.error("Error formatting date:", dateString, err);
      return "N/A";
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

  const canVote = (proposal: Proposal) => {
    return proposal.status.toLowerCase() === "voting";
  };

  const hasUserVoted = (proposal: Proposal): boolean => {
    return userVotes.has(proposal.id);
  };

  const getUserVote = (proposal: Proposal): Vote | undefined => {
    return userVotes.get(proposal.id);
  };

  const canStartVoting = (proposal: Proposal) => {
    return proposal.status.toLowerCase() === "pending";
  };

  const handleStartVoting = async (proposal: Proposal) => {
    try {
      setLoading(true);
      setError(null);
      // Preserve existing votingEndDate if it exists, otherwise let backend set default
      await ownershipService.startVoting(
        proposal.id,
        proposal.votingStartDate || undefined,
        proposal.votingEndDate || undefined
      );
      // Reload proposals after starting voting
      if (selectedGroupId) {
        await loadProposals(selectedGroupId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể bắt đầu biểu quyết");
    } finally {
      setLoading(false);
    }
  };

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
      <PageMeta title="Đồng sở hữu | Biểu Quyết Nhóm" />
      <PageHeader
        title="Biểu Quyết Nhóm"
        description="Tham gia các đề xuất về nâng cấp xe, chia sẻ chi phí và thay đổi chính sách."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            Tạo Đề Xuất
          </Button>
        }
      />

      {groups.length > 0 && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Chọn Nhóm Xe
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
          <p className="text-gray-600 dark:text-gray-400">Đang tải đề xuất...</p>
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
                Không tìm thấy đề xuất nào. Tạo một đề xuất để bắt đầu!
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
                        Chi phí ước tính: {proposal.currency || "VND"}{" "}
                        {proposal.estimatedCost.toLocaleString()}
                      </p>
                    )}
                    {proposal.votingEndDate && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Kết thúc: {formatDate(proposal.votingEndDate)}
                      </p>
                    )}
                    {proposal.totalVotes !== undefined && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Phiếu bầu: {proposal.totalVotes} (
                        {proposal.approveVotes || 0} Đồng ý, {proposal.rejectVotes || 0} Từ chối,{" "}
                        {proposal.abstainVotes || 0} Không ý kiến)
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col">
                    {canStartVoting(proposal) && (
                      <Button
                        size="sm"
                        onClick={() => handleStartVoting(proposal)}
                        disabled={loading}
                      >
                        Bắt Đầu Biểu Quyết
                      </Button>
                    )}
                    {canVote(proposal) && (
                      <>
                        {hasUserVoted(proposal) ? (
                          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Bạn đã bầu:</p>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              {getUserVote(proposal)?.choice === "Approve" ? "Đồng ý" : 
                               getUserVote(proposal)?.choice === "Reject" ? "Từ chối" :
                               getUserVote(proposal)?.choice === "Abstain" ? "Không ý kiến" :
                               getUserVote(proposal)?.choice || "Không xác định"}
                            </p>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(proposal)}
                          >
                            Biểu Quyết
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(proposal)}
                    >
                      Xem Chi Tiết
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
            onSuccess={async () => {
              setShowVoteModal(false);
              setSelectedProposal(null);
              // Reload proposals after voting
              if (selectedGroupId) {
                await loadProposals(selectedGroupId);
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
