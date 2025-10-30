import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getVNPayPaymentStatus } from './api';

export default function VNPayReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processReturn();
  }, []);

  async function processReturn() {
    try {
      // Get all VNPay parameters
      const vnpParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        vnpParams[key] = value;
      });

      console.log('[VNPay Return] Processing return with params:', vnpParams);

      // Check response code
      const responseCode = vnpParams.vnp_ResponseCode;
      const orderId = vnpParams.vnp_TxnRef;
      const amount = vnpParams.vnp_Amount ? parseInt(vnpParams.vnp_Amount) / 100 : 0;
      const transactionNo = vnpParams.vnp_TransactionNo;
      const bankCode = vnpParams.vnp_BankCode;

      // Check if payment has expired (10 minute timeout)
      const history = JSON.parse(localStorage.getItem('vnpay_payment_history') || '[]');
      const paymentRecord = history.find((item: any) => item.id === orderId);
      
      if (paymentRecord && paymentRecord.createdAt) {
        const createdAt = new Date(paymentRecord.createdAt);
        const now = new Date();
        const elapsed = now.getTime() - createdAt.getTime();
        const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

        if (elapsed > TIMEOUT_MS) {
          console.log('[VNPay Return] Payment expired after', Math.floor(elapsed / 60000), 'minutes');
          setStatus('failed');
          setPaymentInfo({
            orderId,
            amount,
            responseCode: '11',
            message: 'Giao dịch hết hạn (quá 10 phút chưa hoàn thành)'
          });

          // Update payment history
          const updatedHistory = history.map((item: any) => {
            if (item.id === orderId) {
              return {
                ...item,
                status: 'Thất bại',
                failReason: 'Giao dịch hết hạn (quá 10 phút chưa hoàn thành)',
                expiredAt: new Date().toISOString(),
                timestamp: new Date().toISOString()
              };
            }
            return item;
          });
          localStorage.setItem('vnpay_payment_history', JSON.stringify(updatedHistory));
          
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'vnpay_payment_history',
            newValue: JSON.stringify(updatedHistory),
            url: window.location.href
          }));

          return;
        }
      }

      if (responseCode === '00') {
        // Success
        setStatus('success');
        setPaymentInfo({
          orderId,
          amount,
          transactionNo,
          bankCode,
          responseCode
        });

        // Update payment history in localStorage
        const history = JSON.parse(localStorage.getItem('vnpay_payment_history') || '[]');
        const updatedHistory = history.map((item: any) => {
          if (item.id === orderId) {
            return {
              ...item,
              status: 'Thành công',
              transactionNo,
              bankCode,
              completedAt: new Date().toISOString(),
              timestamp: new Date().toISOString()
            };
          }
          return item;
        });
        localStorage.setItem('vnpay_payment_history', JSON.stringify(updatedHistory));
        
        // Trigger storage event for same-window updates
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'vnpay_payment_history',
          newValue: JSON.stringify(updatedHistory),
          url: window.location.href
        }));

        console.log('[VNPay Return] Payment successful, history updated:', updatedHistory);
      } else {
        // Failed
        setStatus('failed');
        setPaymentInfo({
          orderId,
          amount,
          responseCode,
          message: getResponseMessage(responseCode)
        });

        // Update payment history in localStorage
        const history = JSON.parse(localStorage.getItem('vnpay_payment_history') || '[]');
        const updatedHistory = history.map((item: any) => {
          if (item.id === orderId) {
            return {
              ...item,
              status: 'Thất bại',
              failReason: getResponseMessage(responseCode),
              completedAt: new Date().toISOString(),
              timestamp: new Date().toISOString()
            };
          }
          return item;
        });
        localStorage.setItem('vnpay_payment_history', JSON.stringify(updatedHistory));
        
        // Trigger storage event for same-window updates
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'vnpay_payment_history',
          newValue: JSON.stringify(updatedHistory),
          url: window.location.href
        }));

        console.log('[VNPay Return] Payment failed, history updated:', responseCode);
      }

      // Optionally query payment status from backend
      if (orderId) {
        try {
          const statusRes = await getVNPayPaymentStatus(orderId);
          console.log('[VNPay Return] Backend status:', statusRes);
        } catch (err) {
          console.warn('[VNPay Return] Could not get backend status:', err);
        }
      }

    } catch (err: any) {
      console.error('[VNPay Return] Error processing return:', err);
      setStatus('failed');
      setError(err.message || 'Có lỗi xảy ra khi xử lý kết quả thanh toán');
    }
  }

  function getResponseMessage(code: string): string {
    const messages: Record<string, string> = {
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

  function formatVND(amount: number): string {
    return amount.toLocaleString('vi-VN') + ' ₫';
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Đang xử lý...</h2>
          <p className="text-slate-600">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
              <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-green-600 mb-2">Thanh toán thành công!</h2>
            <p className="text-slate-600">Giao dịch của bạn đã được xử lý thành công</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-600">Mã đơn hàng:</span>
              <span className="font-semibold">{paymentInfo?.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Số tiền:</span>
              <span className="font-semibold text-green-600">{formatVND(paymentInfo?.amount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mã giao dịch:</span>
              <span className="font-semibold">{paymentInfo?.transactionNo}</span>
            </div>
            {paymentInfo?.bankCode && (
              <div className="flex justify-between">
                <span className="text-slate-600">Ngân hàng:</span>
                <span className="font-semibold">{paymentInfo.bankCode}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transform hover:scale-[1.02] transition-all duration-200"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Failed status
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-red-100 rounded-full mb-4">
            <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-red-600 mb-2">Thanh toán thất bại</h2>
          <p className="text-slate-600 mb-4">{error || paymentInfo?.message || 'Đã có lỗi xảy ra trong quá trình thanh toán'}</p>
        </div>

        {paymentInfo && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 mb-6">
            {paymentInfo.orderId && (
              <div className="flex justify-between">
                <span className="text-slate-600">Mã đơn hàng:</span>
                <span className="font-semibold">{paymentInfo.orderId}</span>
              </div>
            )}
            {paymentInfo.amount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Số tiền:</span>
                <span className="font-semibold">{formatVND(paymentInfo.amount)}</span>
              </div>
            )}
            {paymentInfo.responseCode && (
              <div className="flex justify-between">
                <span className="text-slate-600">Mã lỗi:</span>
                <span className="font-semibold text-red-600">{paymentInfo.responseCode}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transform hover:scale-[1.02] transition-all duration-200"
          >
            Thử lại
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transform hover:scale-[1.02] transition-all duration-200"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}

