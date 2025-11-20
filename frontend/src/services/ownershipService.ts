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

  async getCoOwners(): Promise<CoOwner[]> {
    const response = await apiClient.get<CoOwner[]>(
      API_ENDPOINTS.OWNERSHIP.COOWNERS
    );
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
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
};

