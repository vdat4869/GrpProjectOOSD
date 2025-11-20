import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

// Request/Response Interfaces
export interface BookingSuggestionRequest {
  vehicle_group_id: string;
  requested_start: string; // ISO datetime string
  requested_end: string; // ISO datetime string
  co_owner_id: string;
  ownership_percentage: number;
  usage_history?: UsageHistoryItem[];
}

export interface UsageHistoryItem {
  co_owner_id: string;
  hours?: number;
  distance_km?: number;
  cost?: number;
  start_time?: string;
  end_time?: string;
}

export interface BookingSuggestionResponse {
  suggested_start: string; // ISO datetime string
  suggested_end: string; // ISO datetime string
  fairness_score: number;
  reason: string;
  alternative_slots?: AlternativeSlot[];
}

export interface AlternativeSlot {
  start: string; // ISO datetime string
  end: string; // ISO datetime string
  reason?: string;
}

export interface CostSharingSuggestionRequest {
  vehicle_group_id: string;
  total_cost: number;
  cost_type: string; // "maintenance", "insurance", "charging", "cleaning", "inspection"
  co_owners: CoOwnerInfo[];
}

export interface CoOwnerInfo {
  id: string;
  ownership_percentage: number;
  usage_hours?: number;
}

export interface CostSharingSuggestionResponse {
  suggestions: CostSharingSuggestion[];
  total_suggested: number;
  method: string; // "ownership_based", "usage_based", "hybrid"
}

export interface CostSharingSuggestion {
  co_owner_id: string;
  suggested_amount: number;
  reason: string;
}

export interface VotingSuggestionRequest {
  vehicle_group_id: string;
  proposal_type: string; // "upgrade_battery", "repair", "sell_vehicle", "insurance_change"
  proposal_details: Record<string, any>;
}

export interface VotingSuggestionResponse {
  recommendation: string; // "approve", "reject", "modify"
  reasoning: string;
  suggested_modifications?: Record<string, any>;
  risk_assessment?: RiskAssessment;
}

export interface RiskAssessment {
  financial_risk?: string; // "low", "medium", "high"
  benefit_risk?: string;
  operational_risk?: string;
}

export interface FairnessCheckRequest {
  vehicle_group_id: string;
  co_owner_id?: string;
  period_days?: number;
}

export interface FairnessCheckResponse {
  vehicle_group_id: string;
  period_days: number;
  fairness_score: number;
  recommendations: string[];
  co_owner_usage?: Array<{
    co_owner_id: string;
    usage_hours: number;
    ownership_percentage: number;
    ratio: number;
  }>;
  usage_vs_ownership?: Record<string, number>; // co_owner_id -> ratio
  is_fair?: boolean;
}

export const aiService = {
  // Booking Suggestions
  async getBookingSuggestion(
    request: BookingSuggestionRequest
  ): Promise<BookingSuggestionResponse | null> {
    const response = await apiClient.post<BookingSuggestionResponse>(
      API_ENDPOINTS.AI.BOOKING_SUGGESTION,
      request
    );
    return response.success && response.data ? response.data : null;
  },

  // Cost Sharing Suggestions
  async getCostSharingSuggestion(
    request: CostSharingSuggestionRequest
  ): Promise<CostSharingSuggestionResponse | null> {
    const response = await apiClient.post<CostSharingSuggestionResponse>(
      API_ENDPOINTS.AI.COST_SHARING_SUGGESTION,
      request
    );
    return response.success && response.data ? response.data : null;
  },

  // Voting Suggestions
  async getVotingSuggestion(
    request: VotingSuggestionRequest
  ): Promise<VotingSuggestionResponse | null> {
    const response = await apiClient.post<VotingSuggestionResponse>(
      API_ENDPOINTS.AI.VOTING_SUGGESTION,
      request
    );
    return response.success && response.data ? response.data : null;
  },

  // Fairness Check
  async getFairnessCheck(
    request: FairnessCheckRequest
  ): Promise<FairnessCheckResponse | null> {
    const params = new URLSearchParams({
      vehicle_group_id: request.vehicle_group_id,
    });
    if (request.co_owner_id) {
      params.append("co_owner_id", request.co_owner_id);
    }
    if (request.period_days) {
      params.append("days", request.period_days.toString());
    }

    const response = await apiClient.get<FairnessCheckResponse>(
      `${API_ENDPOINTS.AI.FAIRNESS_CHECK}?${params}`
    );
    return response.success && response.data ? response.data : null;
  },
};

