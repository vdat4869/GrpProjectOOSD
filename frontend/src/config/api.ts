// API Configuration
// Use Gateway URL (port 8000) instead of direct service URL
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    LOGOUT: "/api/auth/logout",
    PROFILE: "/api/auth/profile",
    ME: "/api/auth/me",
    CHANGE_PASSWORD: "/api/auth/change-password",
    REFRESH_TOKEN: "/api/auth/refresh-token",
  },
  // KYC
  KYC: {
    SUBMIT_IDENTITY: "/api/kyc/identity",
    UPLOAD_LICENSE: "/api/kyc/license/upload",
    STATUS: "/api/kyc/status",
  },
  // Ownership
  OWNERSHIP: {
    COOWNERS: "/api/ownership/coowners",
    GROUPS: "/api/ownership/vehiclegroups",
    PROPOSALS_BY_GROUP: "/api/voting/vehicle-group/{groupId}",
    PROPOSAL_BY_ID: "/api/voting/proposals/{id}",
    CREATE_PROPOSAL: "/api/voting/vehicle-group/{groupId}",
    VOTE: "/api/voting/proposals/{id}/vote",
    START_VOTING: "/api/voting/proposals/{id}/start-voting",
    VOTES: "/api/voting/proposals/{id}/votes",
    OWNERSHIPS: "/api/ownership/ownerships",
    OWNERSHIPS_BY_GROUP: "/api/ownership/ownerships/vehicle-group/{vehicleGroupId}",
    OWNERSHIPS_BY_COOWNER: "/api/ownership/ownerships/co-owner/{coOwnerId}",
    CONTRACTS: "/api/ownership/econtracts",
    CONTRACTS_BY_GROUP: "/api/ownership/econtracts/vehicle-group/{vehicleGroupId}",
  },
  // Booking
  BOOKING: {
    BOOKINGS: "/api/booking/allBooking",
    SCHEDULES: "/api/booking/schedules",
    VEHICLES: "/api/booking/vehicles",
    CREATE: "/api/booking/createBooking",
    UPDATE: "/api/booking/edit/{id}",
    CANCEL: "/api/booking/editStatus{id}",
    CHECK_IN: "/api/booking/{id}/check-in",
    CHECK_OUT: "/api/booking/{id}/check-out",
    QR_CODE: "/api/booking/{id}/qr-code",
  },
  // Payment
  PAYMENT: {
    PAYMENT_BY_ID: "/api/payment/payments/{id}",
    PAYMENTS_BY_USER: "/api/payment/payments/user/{userId}",
    CREATE: "/api/payment/payments",
    CANCEL: "/api/payment/payments/{id}/cancel",
    REFUND: "/api/payment/payments/{id}/refund",
    COST_SHARES: "/api/payment/costshares",
    COST_SHARE_BY_ID: "/api/payment/costshares/{id}",
    COST_SHARE_SUGGEST: "/api/payment/costshares/suggest",
    TRANSACTIONS: "/api/payment/transactions",
  },
  // VNPay
  VNPAY: {
    CREATE_PAYMENT: "/api/vnpay/create-payment",
  },
  // AI
  AI: {
    BOOKING_SUGGESTION: "/api/ai/suggestions/booking",
    COST_SHARING_SUGGESTION: "/api/ai/suggestions/cost-sharing",
    VOTING_SUGGESTION: "/api/ai/suggestions/voting",
    FAIRNESS_CHECK: "/api/ai/suggestions/fairness-check",
  },
  // Report
  REPORT: {
    // Analytics
    USAGE_STATISTICS: "/api/analytics/usage-statistics/{vehicleId}",
    COST_STATISTICS: "/api/analytics/cost-statistics/{vehicleId}",
    GENERATE_USAGE_REPORT: "/api/analytics/reports/usage/{vehicleId}",
    GENERATE_COST_REPORT: "/api/analytics/reports/cost/{vehicleId}",
    GENERATE_MAINTENANCE_REPORT: "/api/analytics/reports/maintenance/{vehicleId}",
    REPORTS_BY_VEHICLE: "/api/analytics/reports/vehicle/{vehicleId}",
    REPORTS_BY_TYPE: "/api/analytics/reports/type/{reportType}",
    // History
    USAGE_HISTORY: "/api/history/usage",
    USAGE_HISTORY_BY_ID: "/api/history/usage/{id}",
    USAGE_HISTORY_BY_VEHICLE: "/api/history/usage/vehicle/{vehicleId}",
    USAGE_HISTORY_BY_COOWNER: "/api/history/usage/co-owner/{coOwnerId}",
    USAGE_HISTORY_BY_DATE_RANGE: "/api/history/usage/date-range",
    // Charging Sessions
    CHARGING_SESSION: "/api/history/charging",
    CHARGING_SESSION_BY_ID: "/api/history/charging/{id}",
    CHARGING_SESSIONS_BY_VEHICLE: "/api/history/charging/vehicle/{vehicleId}",
    CHARGING_SESSIONS_BY_COOWNER: "/api/history/charging/co-owner/{coOwnerId}",
    CHARGING_SESSIONS_BY_DATE_RANGE: "/api/history/charging/date-range",
    // Maintenance
    MAINTENANCE_RECORD: "/api/history/maintenance",
    MAINTENANCE_RECORD_BY_ID: "/api/history/maintenance/{id}",
    MAINTENANCE_RECORDS_BY_VEHICLE: "/api/history/maintenance/vehicle/{vehicleId}",
    MAINTENANCE_RECORDS_BY_DATE_RANGE: "/api/history/maintenance/date-range",
  },
} as const;

