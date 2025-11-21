import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

export interface VehicleGroup {
  id: string;
  name: string;
  description?: string;
  vehicleName: string;
  licensePlate?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoOwner {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  isVerified: boolean;
}

export interface Proposal {
  id: string;
  vehicleGroupId: string;
  createdByCoOwnerId?: string;
  createdByCoOwnerName?: string;
  title: string;
  description?: string;
  type: string;
  details?: string;
  estimatedCost?: number;
  currency?: string;
  status: string;
  votingStartDate?: string;
  votingEndDate?: string;
  createdAt: string;
  updatedAt?: string;
  totalVotes?: number;
  approveVotes?: number;
  rejectVotes?: number;
  abstainVotes?: number;
}

export interface Vote {
  id: string;
  proposalId: string;
  coOwnerId: string;
  coOwnerName: string;
  choice: "Approve" | "Reject" | "Abstain";
  comment?: string;
  votedAt: string;
}

export interface Ownership {
  id: string;
  vehicleGroupId: string;
  coOwnerId: string;
  coOwnerName?: string;
  ownershipPercentage: number;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface EContract {
  id: string;
  vehicleGroupId: string;
  contractType: string;
  status: string;
  signedBy?: string[];
  signedAt?: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  vehicleGroupId: string;
  coOwnerId: string;
  coOwnerName?: string;
  role: string;
  status: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const ownershipService = {
  async getGroups(): Promise<VehicleGroup[]> {
    const response = await apiClient.get<VehicleGroup[]>(
      API_ENDPOINTS.OWNERSHIP.GROUPS
    );
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getGroupById(id: string): Promise<VehicleGroup | null> {
    const response = await apiClient.get<VehicleGroup>(
      `${API_ENDPOINTS.OWNERSHIP.GROUPS}/${id}`
    );
    return response.success && response.data ? response.data : null;
  },

  async createGroup(data: {
    name: string;
    description?: string;
    vehicleName: string;
    licensePlate?: string;
    vehicleModel?: string;
    vehicleYear?: string;
  }): Promise<VehicleGroup> {
    const response = await apiClient.post<VehicleGroup>(
      API_ENDPOINTS.OWNERSHIP.GROUPS,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create vehicle group");
    }
    return response.data;
  },

  async updateGroup(id: string, data: {
    name?: string;
    description?: string;
    vehicleName?: string;
    licensePlate?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    status?: string;
  }): Promise<VehicleGroup> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.GROUPS}/${id}`;
    const response = await apiClient.put<VehicleGroup>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to update vehicle group");
    }
    return response.data;
  },

  async deleteGroup(id: string): Promise<void> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.GROUPS}/${id}`;
    const response = await apiClient.delete(endpoint);
    if (!response.success) {
      throw new Error(response.message || "Failed to delete vehicle group");
    }
  },

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.GROUPS}/${groupId}/members`;
    const response = await apiClient.get<GroupMember[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async addCoOwnerToGroup(groupId: string, data: {
    coOwnerId: string;
    role?: string;
  }): Promise<GroupMember> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.GROUPS}/${groupId}/members`;
    const response = await apiClient.post<GroupMember>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to add co-owner to group");
    }
    return response.data;
  },

  async removeCoOwnerFromGroup(groupId: string, memberId: string): Promise<void> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.GROUPS}/${groupId}/members/${memberId}`;
    const response = await apiClient.delete(endpoint);
    if (!response.success) {
      throw new Error(response.message || "Failed to remove co-owner from group");
    }
  },

  async getCoOwners(): Promise<CoOwner[]> {
    const response = await apiClient.get<CoOwner[]>(
      API_ENDPOINTS.OWNERSHIP.COOWNERS
    );
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getCoOwnerById(id: string): Promise<CoOwner | null> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.COOWNERS}/${id}`;
    const response = await apiClient.get<CoOwner>(endpoint);
    return response.success && response.data ? response.data : null;
  },

  async getCoOwnerByUserId(userId: string): Promise<CoOwner | null> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.COOWNERS}/user/${userId}`;
    const response = await apiClient.get<CoOwner>(endpoint);
    return response.success && response.data ? response.data : null;
  },

  async createCoOwner(data: {
    userId: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    address?: string;
  }): Promise<CoOwner> {
    const response = await apiClient.post<CoOwner>(
      API_ENDPOINTS.OWNERSHIP.COOWNERS,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create co-owner");
    }
    return response.data;
  },

  async updateCoOwner(id: string, data: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
  }): Promise<CoOwner> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.COOWNERS}/${id}`;
    const response = await apiClient.put<CoOwner>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to update co-owner");
    }
    return response.data;
  },

  async deleteCoOwner(id: string): Promise<void> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.COOWNERS}/${id}`;
    const response = await apiClient.delete(endpoint);
    if (!response.success) {
      throw new Error(response.message || "Failed to delete co-owner");
    }
  },

  async verifyCoOwner(id: string): Promise<CoOwner> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.COOWNERS}/${id}/verify`;
    const response = await apiClient.post<CoOwner>(endpoint);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to verify co-owner");
    }
    return response.data;
  },

  async getProposals(groupId?: string, status?: string): Promise<Proposal[]> {
    if (!groupId) {
      // Get all proposals if no groupId provided
      const groups = await this.getGroups();
      if (groups.length === 0) return [];
      // Get proposals from first group as fallback
      groupId = groups[0].id;
    }
    let endpoint = API_ENDPOINTS.OWNERSHIP.PROPOSALS_BY_GROUP.replace("{groupId}", groupId);
    if (status) {
      endpoint += `?status=${status}`;
    }
    const response = await apiClient.get<Proposal[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getProposalById(id: string): Promise<Proposal | null> {
    const endpoint = API_ENDPOINTS.OWNERSHIP.PROPOSAL_BY_ID.replace("{id}", id);
    const response = await apiClient.get<Proposal>(endpoint);
    return response.success && response.data ? response.data : null;
  },

  async voteOnProposal(proposalId: string, choice: "Approve" | "Reject" | "Abstain", comment?: string): Promise<void> {
    const endpoint = API_ENDPOINTS.OWNERSHIP.VOTE.replace("{id}", proposalId);
    const response = await apiClient.post(endpoint, { choice, comment });
    if (!response.success) {
      throw new Error(response.message || "Failed to vote on proposal");
    }
  },

  async createProposal(groupId: string, data: {
    title: string;
    description?: string;
    type: string;
    details?: string;
    estimatedCost?: number;
    currency?: string;
    votingStartDate?: string;
    votingEndDate?: string;
  }): Promise<Proposal> {
    const endpoint = API_ENDPOINTS.OWNERSHIP.CREATE_PROPOSAL.replace("{groupId}", groupId);
    const response = await apiClient.post<Proposal>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create proposal");
    }
    return response.data;
  },

  async startVoting(proposalId: string, startDate?: string, endDate?: string): Promise<Proposal> {
    const endpoint = API_ENDPOINTS.OWNERSHIP.START_VOTING.replace("{id}", proposalId);
    const response = await apiClient.post<Proposal>(endpoint, {
      startDate,
      endDate,
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to start voting");
    }
    return response.data;
  },

  async getVotes(proposalId: string): Promise<Vote[]> {
    const endpoint = API_ENDPOINTS.OWNERSHIP.VOTES.replace("{id}", proposalId);
    const response = await apiClient.get<Vote[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getOwnerships(vehicleGroupId?: string, coOwnerId?: string, isActive?: boolean): Promise<Ownership[]> {
    let endpoint: string;
    if (vehicleGroupId) {
      endpoint = API_ENDPOINTS.OWNERSHIP.OWNERSHIPS_BY_GROUP.replace("{vehicleGroupId}", vehicleGroupId);
      if (isActive !== undefined) {
        endpoint += `?isActive=${isActive}`;
      }
    } else if (coOwnerId) {
      endpoint = API_ENDPOINTS.OWNERSHIP.OWNERSHIPS_BY_COOWNER.replace("{coOwnerId}", coOwnerId);
      if (isActive !== undefined) {
        endpoint += `?isActive=${isActive}`;
      }
    } else {
      return [];
    }
    const response = await apiClient.get<Ownership[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async createOwnership(data: {
    vehicleGroupId: string;
    coOwnerId: string;
    ownershipPercentage: number;
    startDate: string;
    endDate?: string;
  }): Promise<Ownership> {
    const response = await apiClient.post<Ownership>(
      API_ENDPOINTS.OWNERSHIP.OWNERSHIPS,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create ownership");
    }
    return response.data;
  },

  async updateOwnership(id: string, data: {
    ownershipPercentage?: number;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<Ownership> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.OWNERSHIPS}/${id}`;
    const response = await apiClient.put<Ownership>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to update ownership");
    }
    return response.data;
  },

  async deleteOwnership(id: string): Promise<void> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.OWNERSHIPS}/${id}`;
    const response = await apiClient.delete(endpoint);
    if (!response.success) {
      throw new Error(response.message || "Failed to delete ownership");
    }
  },

  async getContracts(vehicleGroupId: string, status?: string): Promise<EContract[]> {
    let endpoint = API_ENDPOINTS.OWNERSHIP.CONTRACTS_BY_GROUP.replace("{vehicleGroupId}", vehicleGroupId);
    if (status) {
      endpoint += `?status=${status}`;
    }
    const response = await apiClient.get<EContract[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async createContract(data: {
    vehicleGroupId: string;
    contractType: string;
    content?: string;
    terms?: string;
  }): Promise<EContract> {
    const response = await apiClient.post<EContract>(
      API_ENDPOINTS.OWNERSHIP.CONTRACTS,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create contract");
    }
    return response.data;
  },

  async signContract(contractId: string): Promise<EContract> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.CONTRACTS}/${contractId}/sign`;
    const response = await apiClient.post<EContract>(endpoint);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to sign contract");
    }
    return response.data;
  },

  async approveContract(contractId: string): Promise<EContract> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.CONTRACTS}/${contractId}/approve`;
    const response = await apiClient.post<EContract>(endpoint);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to approve contract");
    }
    return response.data;
  },

  async deleteContract(contractId: string): Promise<void> {
    const endpoint = `${API_ENDPOINTS.OWNERSHIP.CONTRACTS}/${contractId}`;
    const response = await apiClient.delete(endpoint);
    if (!response.success) {
      throw new Error(response.message || "Failed to delete contract");
    }
  },

  // Group Funds methods
  async getGroupFunds(groupId: string): Promise<GroupFund[]> {
    const endpoint = API_ENDPOINTS.OWNERSHIP.GROUP_FUNDS.replace("{groupId}", groupId);
    const response = await apiClient.get<GroupFund[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async createGroupFund(groupId: string, data: {
    name: string;
    description?: string;
    currency?: string;
  }): Promise<GroupFund> {
    const endpoint = API_ENDPOINTS.OWNERSHIP.GROUP_FUNDS.replace("{groupId}", groupId);
    const response = await apiClient.post<GroupFund>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create group fund");
    }
    return response.data;
  },

  async getFundTransactions(fundId: string, type?: string): Promise<FundTransaction[]> {
    let endpoint = API_ENDPOINTS.OWNERSHIP.GROUP_FUND_TRANSACTIONS.replace("{fundId}", fundId);
    if (type) {
      endpoint += `?type=${type}`;
    }
    const response = await apiClient.get<FundTransaction[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async createFundTransaction(fundId: string, data: {
    type: string; // Contribution, Expense
    amount: number;
    description?: string;
    category?: string;
    receiptNumber?: string;
    receiptImageUrl?: string;
    transactionDate?: string;
  }): Promise<FundTransaction> {
    const endpoint = API_ENDPOINTS.OWNERSHIP.CREATE_GROUP_FUND_TRANSACTION.replace("{fundId}", fundId);
    const response = await apiClient.post<FundTransaction>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create fund transaction");
    }
    return response.data;
  },

  async approveFundTransaction(transactionId: string): Promise<FundTransaction> {
    const endpoint = API_ENDPOINTS.OWNERSHIP.APPROVE_FUND_TRANSACTION.replace("{transactionId}", transactionId);
    const response = await apiClient.post<FundTransaction>(endpoint);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to approve fund transaction");
    }
    return response.data;
  },
};

export interface GroupFund {
  id: string;
  vehicleGroupId: string;
  name: string;
  description?: string;
  balance: number;
  currency: string;
  status: string;
  transactionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FundTransaction {
  id: string;
  groupFundId: string;
  coOwnerId: string;
  coOwnerName?: string;
  type: string; // Contribution, Expense
  amount: number;
  currency: string;
  description?: string;
  category?: string;
  receiptNumber?: string;
  receiptImageUrl?: string;
  status: string;
  approvedByCoOwnerId?: string;
  approvedAt?: string;
  transactionDate: string;
  createdAt: string;
}

