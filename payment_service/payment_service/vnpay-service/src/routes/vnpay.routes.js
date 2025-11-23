const express = require('express');
const router = express.Router();
const vnpayController = require('../controllers/vnpay.controller');

/**
 * VNPay Routes
 * 
 * API Documentation:
 * - VNPay Official: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 * - Library: https://github.com/lehuygiang28/vnpay
 */

// Create payment URL
// POST /api/vnpay/create-payment
// Body: { amount, orderId, orderInfo, orderType, bankCode, locale, costShareDetailId, walletId }
router.post('/create-payment', vnpayController.createPaymentUrl);

// Handle return from VNPay (user redirected here after payment)
// GET /api/vnpay/return?vnp_*=...
router.get('/return', vnpayController.handleReturn);

// Handle IPN callback from VNPay (server-to-server notification)
// GET /api/vnpay/ipn?vnp_*=...
router.get('/ipn', vnpayController.handleIPN);

// Query transaction status
// POST /api/vnpay/query
// Body: { orderId, transDate }
router.post('/query', vnpayController.queryTransaction);

// Refund transaction
// POST /api/vnpay/refund
// Body: { orderId, amount, transDate, transactionNo, createBy }
router.post('/refund', vnpayController.refundTransaction);

// Get payment status from local store
// GET /api/vnpay/payment-status/:orderId
router.get('/payment-status/:orderId', vnpayController.getPaymentStatus);

module.exports = router;

