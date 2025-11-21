import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

// Enums matching backend
export enum PaymentStatus {
  Pending = 0,
  Processing = 1,
  Completed = 2,
  Failed = 3,
  Cancelled = 4,
  Refunded = 5,
}

export enum PaymentMethodType {
  Banking = 2,
  EWallet = 3,
  Cash = 4,
}

export enum CostType {
  Charging = 0,
  Insurance = 1,
  Maintenance = 2,
  Registration = 3,
  Cleaning = 4,
  Parking = 5,
  Toll = 6,
  Other = 7,
}

export enum TransactionType {
  Payment = 0,
  Refund = 1,
  Transfer = 2,
  Deposit = 3,
  Withdrawal = 4,
}

// Interfaces
export interface Payment {
  id: string;
  costShareDetailId: string;
  walletId: string;
  method: PaymentMethodType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionId?: string;
  externalTransactionId?: string;
  paymentUrl?: string;
  processedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface CreatePaymentRequest {
  costShareDetailId: string;
  walletId: string;
  method: PaymentMethodType;
  amount: number;
  currency?: string;
  callbackUrl?: string;
  returnUrl?: string;
}

export interface CostShare {
  id: string;
  groupId: string;
  vehicleId: string;
  costType: CostType;
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  receiptUrl?: string;
  createdAt: string;
  costShareDetails?: CostShareDetail[];
}

export interface CostShareDetail {
  id: string;
  costShareId: string;
  userId: string;
  ownershipPercentage: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidDate?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateCostShareRequest {
  groupId: string;
  vehicleId: string;
  costType: CostType;
  title: string;
  description?: string;
  totalAmount: number;
  currency?: string;
  dueDate: string;
  receiptUrl?: string;
  costShareDetails: CreateCostShareDetailRequest[];
}

export interface CreateCostShareDetailRequest {
  userId: string;
  ownershipPercentage: number;
  amount: number;
  notes?: string;
}

export interface UpdateCostShareRequest {
  title?: string;
  description?: string;
  totalAmount?: number;
  dueDate?: string;
  receiptUrl?: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  relatedTransactionId?: string;
  status: number;
  processedAt?: string;
  metadata?: string;
  createdAt: string;
}

export interface CreateTransactionRequest {
  walletId: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  description?: string;
  reference?: string;
  relatedTransactionId?: string;
  metadata?: string;
}

export interface CostSharingSuggestion {
  coOwnerId: string;
  suggestedAmount: number;
  reason: string;
  method: string; // ownership_based, usage_based, hybrid
}

export interface GetCostSharingSuggestionRequest {
  groupId: string;
  totalCost: number;
  costType: string; // maintenance, insurance, charging, cleaning, inspection
}

export interface VNPayCreatePaymentRequest {
  amount: number;
  orderId: string;
  orderInfo?: string;
  orderType?: string;
  bankCode?: string;
  locale?: string;
  costShareDetailId?: string;
  walletId?: string;
}

export interface VNPayCreatePaymentResponse {
  paymentUrl: string;
  orderId: string;
}

export const paymentService = {
  // Payment methods
  async getPayments(userId: string, page: number = 1, pageSize: number = 20): Promise<Payment[]> {
    if (!userId) {
      return [];
    }
    const endpoint = `${API_ENDPOINTS.PAYMENT.PAYMENTS_BY_USER.replace("{userId}", userId)}?page=${page}&pageSize=${pageSize}`;
    const response = await apiClient.get<Payment[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getPaymentById(id: string): Promise<Payment | null> {
    const endpoint = API_ENDPOINTS.PAYMENT.PAYMENT_BY_ID.replace("{id}", id);
    const response = await apiClient.get<Payment>(endpoint);
    if (!response.success || !response.data) {
      return null;
    }
    return response.data;
  },

  async createPayment(request: CreatePaymentRequest): Promise<Payment> {
    const response = await apiClient.post<Payment>(API_ENDPOINTS.PAYMENT.CREATE, request);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create payment");
    }
    return response.data;
  },

  async cancelPayment(id: string): Promise<boolean> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.PAYMENT_BY_ID.replace("{id}", id)}/cancel`;
    const response = await apiClient.post(endpoint);
    return response.success;
  },

  async refundPayment(id: string, amount?: number): Promise<boolean> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.PAYMENT_BY_ID.replace("{id}", id)}/refund`;
    const response = await apiClient.post(endpoint, amount ? { amount } : {});
    return response.success;
  },

  // Cost Share methods
  async getCostShares(groupId?: string, page: number = 1, pageSize: number = 20): Promise<CostShare[]> {
    let endpoint = groupId
      ? `${API_ENDPOINTS.PAYMENT.COST_SHARES}/group/${groupId}?page=${page}&pageSize=${pageSize}`
      : `${API_ENDPOINTS.PAYMENT.COST_SHARES}?page=${page}&pageSize=${pageSize}`;
    const response = await apiClient.get<CostShare[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getCostShareById(id: string): Promise<CostShare | null> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.COST_SHARES}/${id}`;
    const response = await apiClient.get<CostShare>(endpoint);
    if (!response.success || !response.data) {
      return null;
    }
    return response.data;
  },

  async createCostShare(request: CreateCostShareRequest): Promise<CostShare> {
    const response = await apiClient.post<CostShare>(API_ENDPOINTS.PAYMENT.COST_SHARES, request);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create cost share");
    }
    return response.data;
  },

  async updateCostShare(id: string, request: UpdateCostShareRequest): Promise<CostShare> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.COST_SHARES}/${id}`;
    const response = await apiClient.put<CostShare>(endpoint, request);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to update cost share");
    }
    return response.data;
  },

  async deleteCostShare(id: string): Promise<boolean> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.COST_SHARES}/${id}`;
    const response = await apiClient.delete(endpoint);
    return response.success;
  },

  async getCostShareDetails(costShareId: string): Promise<CostShareDetail[]> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.COST_SHARES}/${costShareId}/details`;
    const response = await apiClient.get<CostShareDetail[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async markCostShareDetailAsPaid(costShareDetailId: string): Promise<boolean> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.COST_SHARES}/${costShareDetailId}/mark-paid`;
    const response = await apiClient.post(endpoint);
    return response.success;
  },

  async getCostSharingSuggestion(request: GetCostSharingSuggestionRequest): Promise<CostSharingSuggestion[]> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.COST_SHARE_SUGGEST}/suggestions`;
    const response = await apiClient.post<CostSharingSuggestion[]>(endpoint, request);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  // Transaction methods
  async getTransactions(walletId: string, page: number = 1, pageSize: number = 20): Promise<Transaction[]> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.TRANSACTIONS}?walletId=${walletId}&page=${page}&pageSize=${pageSize}`;
    const response = await apiClient.get<Transaction[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
    const response = await apiClient.post<Transaction>(API_ENDPOINTS.PAYMENT.TRANSACTIONS, request);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create transaction");
    }
    return response.data;
  },

  // VNPay methods
  async createVNPayPayment(request: VNPayCreatePaymentRequest): Promise<VNPayCreatePaymentResponse> {
    const endpoint = "/api/vnpay/create-payment";
    const response = await apiClient.post<VNPayCreatePaymentResponse>(endpoint, request);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create VNPay payment");
    }
    return response.data;
  },

  // Company Payment Request methods
  async createCompanyPaymentRequest(request: {
    serviceType: string;
    amount?: number;
    description?: string;
    qrCode?: string;
    imageUrls?: string[];
  }): Promise<CompanyPaymentRequest> {
    const response = await apiClient.post<CompanyPaymentRequest>(
      API_ENDPOINTS.PAYMENT.COMPANY_PAYMENT_REQUESTS,
      request
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create company payment request");
    }
    return response.data;
  },

  async getCompanyPaymentRequestById(id: string): Promise<CompanyPaymentRequest | null> {
    const endpoint = API_ENDPOINTS.PAYMENT.COMPANY_PAYMENT_REQUEST_BY_ID.replace("{id}", id);
    const response = await apiClient.get<CompanyPaymentRequest>(endpoint);
    if (!response.success || !response.data) {
      return null;
    }
    return response.data;
  },

  async getCompanyPaymentRequestsByUser(userId: string, page: number = 1, pageSize: number = 20): Promise<CompanyPaymentRequest[]> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.COMPANY_PAYMENT_REQUESTS_BY_USER.replace("{userId}", userId)}?page=${page}&pageSize=${pageSize}`;
    const response = await apiClient.get<CompanyPaymentRequest[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getMyCompanyPaymentRequests(status?: string, page: number = 1, pageSize: number = 20): Promise<CompanyPaymentRequest[]> {
    let endpoint = `${API_ENDPOINTS.PAYMENT.MY_COMPANY_PAYMENT_REQUESTS}?page=${page}&pageSize=${pageSize}`;
    if (status) {
      endpoint += `&status=${status}`;
    }
    const response = await apiClient.get<CompanyPaymentRequest[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getAllCompanyPaymentRequests(status?: string, page: number = 1, pageSize: number = 20): Promise<CompanyPaymentRequest[]> {
    let endpoint = `${API_ENDPOINTS.PAYMENT.COMPANY_PAYMENT_REQUESTS}?page=${page}&pageSize=${pageSize}`;
    if (status) {
      endpoint += `&status=${status}`;
    }
    const response = await apiClient.get<CompanyPaymentRequest[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async updateCompanyPaymentRequest(id: string, data: {
    status?: string;
    companyNotes?: string;
    refundAmount?: number;
    refundTransactionId?: string;
  }): Promise<CompanyPaymentRequest> {
    const endpoint = `${API_ENDPOINTS.PAYMENT.COMPANY_PAYMENT_REQUESTS}/${id}`;
    const response = await apiClient.put<CompanyPaymentRequest>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to update company payment request");
    }
    return response.data;
  },

  async cancelCompanyPaymentRequest(id: string): Promise<CompanyPaymentRequest> {
    const endpoint = API_ENDPOINTS.PAYMENT.COMPANY_PAYMENT_REQUEST_CANCEL.replace("{id}", id);
    const response = await apiClient.post<CompanyPaymentRequest>(endpoint);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to cancel company payment request");
    }
    return response.data;
  },

  async deleteCompanyPaymentRequest(id: string): Promise<void> {
    const endpoint = API_ENDPOINTS.PAYMENT.COMPANY_PAYMENT_REQUEST_DELETE.replace("{id}", id);
    const response = await apiClient.delete(endpoint);
    if (!response.success) {
      throw new Error(response.message || "Failed to delete company payment request");
    }
  },
};

export interface CompanyPaymentRequest {
  id: string;
  userId: string;
  serviceType: string;
  amount?: number;
  description?: string;
  qrCode?: string;
  imageUrls?: string[];
  status: string;
  companyNotes?: string;
  processedAt?: string;
  refundAmount?: number;
  refundTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

