require('dotenv').config();
const { VNPay, ProductCode, VnpLocale } = require('vnpay');

/**
 * VNPay Configuration using Official Library
 * 
 * Documentation:
 * - Official VNPay API: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 * - Library: https://github.com/lehuygiang28/vnpay
 * - Library Docs: https://vnpay.js.org/
 * 
 * Test Environment Credentials:
 * - Terminal ID (vnp_TmnCode): 8LSI1RMU
 * - Secret Key (vnp_HashSecret): IJ6ABY1X6OZFCPIR7AKXKH7X36Q09EH0
 * - Payment Gateway: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
 * - API: https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
 */

// Initialize VNPay instance with official library
const vnpay = new VNPay({
  tmnCode: process.env.VNP_TMN_CODE,
  secureSecret: process.env.VNP_HASH_SECRET,
  vnpayHost: process.env.VNP_HOST || 'https://sandbox.vnpayment.vn',
  testMode: process.env.NODE_ENV !== 'production',
  hashAlgorithm: 'SHA512', // VNPay uses SHA512
  enableLog: true, // Enable logging in development
});

// Export configuration
module.exports = {
  vnpay,
  ProductCode,
  VnpLocale,
  
  // Additional config for convenience
  config: {
    tmnCode: process.env.VNP_TMN_CODE,
    returnUrl: process.env.VNP_RETURN_URL || 'http://localhost:5173/vnpay-return',
    ipnUrl: process.env.VNP_IPN_URL || 'http://localhost:3001/api/vnpay/ipn',
    paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004',
  }
};

