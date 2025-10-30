const { vnpay, ProductCode, VnpLocale, config } = require('../config/vnpay.config');
const axios = require('axios');

// In-memory storage for payment tracking (replace with database in production)
const paymentStore = new Map();

/**
 * Create VNPay payment URL
 * POST /api/vnpay/create-payment
 * 
 * Reference: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html#tao-url-thanh-toan
 */
const createPaymentUrl = async (req, res) => {
  try {
    const {
      amount,
      orderId,
      orderInfo,
      orderType,
      bankCode,
      locale,
      costShareDetailId,
      walletId
    } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Amount must be greater than 0'
      });
    }

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Get client IP address
    const ipAddr = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.socket.remoteAddress || 
                   '127.0.0.1';

    // Clean IP address (remove IPv6 prefix if present)
    const cleanIpAddr = ipAddr.replace('::ffff:', '');

    // Sanitize orderInfo
    const sanitizedOrderInfo = (orderInfo || `Payment for order ${orderId}`)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s\-\.]/g, '')
      .substring(0, 255);

    console.log(`[VNPay] Creating payment URL for order ${orderId}`);
    console.log(`[VNPay] Amount: ${amount} VND, IP: ${cleanIpAddr}`);

    // Build payment URL using official library
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: parseInt(amount),
      vnp_IpAddr: cleanIpAddr,
      vnp_TxnRef: String(orderId).substring(0, 50),
      vnp_OrderInfo: sanitizedOrderInfo,
      vnp_OrderType: orderType || 'other',
      vnp_ReturnUrl: config.returnUrl,
      vnp_Locale: locale === 'en' ? VnpLocale.EN : VnpLocale.VN,
      ...(bankCode && { vnp_BankCode: bankCode })
    });

    // Store payment info for tracking
    paymentStore.set(orderId, {
      orderId,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      costShareDetailId,
      walletId,
      orderInfo: sanitizedOrderInfo
    });

    console.log(`[VNPay] Payment URL created successfully`);
    console.log(`[VNPay] URL length: ${paymentUrl.length} characters`);

    res.json({
      success: true,
      data: {
        paymentUrl,
        orderId
      }
    });

  } catch (error) {
    console.error('[VNPay] Create payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment URL'
    });
  }
};

/**
 * Handle return from VNPay
 * GET /api/vnpay/return
 * 
 * Reference: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html#code-returnurl
 */
const handleReturn = async (req, res) => {
  try {
    const vnpParams = req.query;

    console.log(`[VNPay Return] Processing return for order: ${vnpParams.vnp_TxnRef}`);

    // Verify signature using official library
    const verify = vnpay.verifyReturnUrl(vnpParams);

    if (!verify.isVerified) {
      console.error('[VNPay Return] Invalid signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature',
        code: 'INVALID_SIGNATURE'
      });
    }

    console.log(`[VNPay Return] Signature verified successfully`);
    console.log(`[VNPay Return] Payment result: ${verify.isSuccess ? 'SUCCESS' : 'FAILED'}`);
    console.log(`[VNPay Return] Response code: ${vnpParams.vnp_ResponseCode}`);

    const orderId = vnpParams.vnp_TxnRef;
    const responseCode = vnpParams.vnp_ResponseCode;
    const amount = parseInt(vnpParams.vnp_Amount) / 100;
    const transactionNo = vnpParams.vnp_TransactionNo;
    const bankCode = vnpParams.vnp_BankCode;
    const payDate = vnpParams.vnp_PayDate;

    // Update payment store
    const paymentInfo = paymentStore.get(orderId);
    if (paymentInfo) {
      paymentInfo.status = verify.isSuccess ? 'success' : 'failed';
      paymentInfo.responseCode = responseCode;
      paymentInfo.transactionNo = transactionNo;
      paymentInfo.bankCode = bankCode;
      paymentInfo.payDate = payDate;
      paymentStore.set(orderId, paymentInfo);
    }

    // Notify C# Payment Service
    if (verify.isSuccess && paymentInfo) {
      try {
        await notifyPaymentService({
          orderId,
          amount,
          status: 'success',
          transactionNo,
          paymentMethod: 'VNPay',
          costShareDetailId: paymentInfo.costShareDetailId,
          walletId: paymentInfo.walletId
        });
      } catch (error) {
        console.error('[VNPay Return] Failed to notify payment service:', error.message);
      }
    }

    res.json({
      success: true,
      data: {
        orderId,
        amount,
        status: verify.isSuccess ? 'success' : 'failed',
        responseCode,
        transactionNo,
        bankCode,
        message: verify.message || getResponseMessage(responseCode)
      }
    });

  } catch (error) {
    console.error('[VNPay Return] Handler error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process return'
    });
  }
};

/**
 * Handle IPN (Instant Payment Notification) from VNPay
 * GET /api/vnpay/ipn
 * 
 * Reference: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html#code-ipn-url
 * 
 * IMPORTANT: VNPay sends IPN via GET method
 * Response must be: { RspCode: '00', Message: 'Confirm Success' }
 */
const handleIPN = async (req, res) => {
  try {
    const vnpParams = req.query;

    console.log(`[VNPay IPN] Received notification for order: ${vnpParams.vnp_TxnRef}`);
    console.log(`[VNPay IPN] Response code: ${vnpParams.vnp_ResponseCode}`);

    // Validate required parameters
    if (!vnpParams.vnp_TxnRef || !vnpParams.vnp_Amount || !vnpParams.vnp_ResponseCode) {
      console.error('[VNPay IPN] Missing required parameters');
      return res.status(200).json({ 
        RspCode: '99', 
        Message: 'Missing required parameters' 
      });
    }

    // Verify IPN signature using official library
    const verify = vnpay.verifyIpnCall(vnpParams);

    if (!verify.isVerified) {
      console.error('[VNPay IPN] Invalid signature');
      return res.status(200).json({ 
        RspCode: '97', 
        Message: 'Invalid signature' 
      });
    }

    console.log('[VNPay IPN] Signature verified successfully');

    const orderId = vnpParams.vnp_TxnRef;
    const responseCode = vnpParams.vnp_ResponseCode;
    const amount = parseInt(vnpParams.vnp_Amount) / 100;
    const transactionNo = vnpParams.vnp_TransactionNo;

    // Check if order exists
    const paymentInfo = paymentStore.get(orderId);
    if (!paymentInfo) {
      console.error(`[VNPay IPN] Order ${orderId} not found`);
      return res.status(200).json({ 
        RspCode: '01', 
        Message: 'Order not found' 
      });
    }

    // Check if already processed
    if (paymentInfo.ipnReceived && paymentInfo.status === 'success') {
      console.warn(`[VNPay IPN] Order ${orderId} already confirmed`);
      return res.status(200).json({ 
        RspCode: '02', 
        Message: 'Order already confirmed' 
      });
    }

    // Verify amount matches
    if (Math.abs(paymentInfo.amount - amount) > 0.01) {
      console.error(`[VNPay IPN] Amount mismatch for ${orderId}`);
      return res.status(200).json({ 
        RspCode: '04', 
        Message: 'Invalid amount' 
      });
    }

    // Update payment status
    paymentInfo.status = verify.isSuccess ? 'success' : 'failed';
    paymentInfo.responseCode = responseCode;
    paymentInfo.transactionNo = transactionNo;
    paymentInfo.ipnReceived = true;
    paymentInfo.ipnDate = new Date().toISOString();
    paymentStore.set(orderId, paymentInfo);

    console.log(`[VNPay IPN] Updated order ${orderId} status to: ${paymentInfo.status}`);

    // Notify C# Payment Service
    if (verify.isSuccess) {
      try {
        console.log(`[VNPay IPN] Notifying payment service for order ${orderId}`);
        await notifyPaymentService({
          orderId,
          amount,
          status: 'success',
          transactionNo,
          paymentMethod: 'VNPay',
          costShareDetailId: paymentInfo.costShareDetailId,
          walletId: paymentInfo.walletId
        });
        console.log(`[VNPay IPN] Payment service notified successfully`);
      } catch (error) {
        console.error('[VNPay IPN] Failed to notify payment service:', error.message);
        // Don't fail IPN even if notification fails
      }
    }

    // Return success to VNPay
    console.log(`[VNPay IPN] Responding with success`);
    return res.status(200).json({ 
      RspCode: '00', 
      Message: 'Confirm Success' 
    });

  } catch (error) {
    console.error('[VNPay IPN] Handler error:', error);
    return res.status(200).json({ 
      RspCode: '99', 
      Message: 'Unknown error' 
    });
  }
};

/**
 * Query transaction status
 * POST /api/vnpay/query
 * 
 * Reference: https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr&refund.html
 */
const queryTransaction = async (req, res) => {
  try {
    const { orderId, transDate } = req.body;

    if (!orderId || !transDate) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and transaction date are required'
      });
    }

    const ipAddr = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.socket.remoteAddress || 
                   '127.0.0.1';
    const cleanIpAddr = ipAddr.replace('::ffff:', '');

    console.log(`[VNPay Query] Querying transaction ${orderId}`);

    const result = await vnpay.queryDr({
      vnp_TxnRef: orderId,
      vnp_TransactionDate: transDate,
      vnp_CreateDate: new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
      vnp_IpAddr: cleanIpAddr,
      vnp_OrderInfo: `Query for ${orderId}`
    });

    console.log(`[VNPay Query] Result:`, result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[VNPay Query] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to query transaction'
    });
  }
};

/**
 * Refund transaction
 * POST /api/vnpay/refund
 * 
 * Reference: https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr&refund.html
 */
const refundTransaction = async (req, res) => {
  try {
    const {
      orderId,
      amount,
      transDate,
      transactionNo,
      createBy
    } = req.body;

    if (!orderId || !amount || !transDate || !transactionNo) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    const ipAddr = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.socket.remoteAddress || 
                   '127.0.0.1';
    const cleanIpAddr = ipAddr.replace('::ffff:', '');

    console.log(`[VNPay Refund] Processing refund for ${orderId}`);

    const result = await vnpay.refund({
      vnp_TxnRef: orderId,
      vnp_Amount: parseInt(amount),
      vnp_TransactionDate: transDate,
      vnp_TransactionNo: transactionNo,
      vnp_CreateBy: createBy || 'System',
      vnp_CreateDate: new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
      vnp_IpAddr: cleanIpAddr,
      vnp_OrderInfo: `Refund for ${orderId}`,
      vnp_TransactionType: '02' // 02: Partial refund, 03: Full refund
    });

    console.log(`[VNPay Refund] Result:`, result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[VNPay Refund] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to refund transaction'
    });
  }
};

/**
 * Get payment status from local store
 * GET /api/vnpay/payment-status/:orderId
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const paymentInfo = paymentStore.get(orderId);
    if (!paymentInfo) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: paymentInfo
    });

  } catch (error) {
    console.error('[VNPay] Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment status'
    });
  }
};

/**
 * Notify C# Payment Service about successful payment
 */
async function notifyPaymentService(paymentData) {
  const url = `${config.paymentServiceUrl}/api/VNPay/callback`;
  
  console.log(`[VNPay] Notifying C# Payment Service: ${url}`);
  console.log(`[VNPay] Payload:`, JSON.stringify(paymentData, null, 2));
  
  try {
    const response = await axios.post(url, paymentData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`[VNPay] C# Payment Service response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[VNPay] Failed to notify C# Payment Service:`, error.message);
    if (error.response) {
      console.error(`[VNPay] Response status:`, error.response.status);
      console.error(`[VNPay] Response data:`, error.response.data);
    }
    throw error;
  }
}

/**
 * Get response message based on VNPay response code
 */
function getResponseMessage(code) {
  const messages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
    '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
    '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
    '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Các lỗi khác'
  };

  return messages[code] || 'Giao dịch thất bại';
}

module.exports = {
  createPaymentUrl,
  handleReturn,
  handleIPN,
  queryTransaction,
  refundTransaction,
  getPaymentStatus
};

