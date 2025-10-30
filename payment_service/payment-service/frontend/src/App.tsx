import { useEffect, useState, useRef } from 'react'
import { getCostSharesByGroup, createCostShare, createPayment, getPaymentsByUser, setMockMode, createVNPayPayment } from './api'
import promoCodesData from './promoCodes.json'

function App() {
  const [activeTab, setActiveTab] = useState<'payment' | 'costshare' | 'history'>('costshare')
  // Prototype mode uses mock data; no need for IDs
  const vehicles = ['Tesla Model Y','BYD Dolphin','VinFast VF 5','Li Auto L6','Tesla Model 3','VinFast VF 8','Volkswagen ID.7','Nissan Ariya']
  const costs = ['Phí sạc','Bảo dưỡng','Bảo hiểm','Đăng kiểm','Rửa xe','Gửi xe']
  // Base cost by expense type (VND)
  const costBaseMap: Record<string, number> = {
    'Phí sạc': 200000,
    'Bảo dưỡng': 1200000,
    'Bảo hiểm': 5000000,
    'Đăng kiểm': 340000,
    'Rửa xe': 100000,
    'Gửi xe': 800000,
  }
  // Vehicle-specific multiplier so each vehicle has different total costs
  const vehicleMultiplier: Record<string, number> = {
    'Tesla Model Y': 1.2,
    'BYD Dolphin': 0.85,
    'VinFast VF 5': 0.9,
    'Li Auto L6': 1.15,
    'Tesla Model 3': 1.1,
    'VinFast VF 8': 1.0,
    'Volkswagen ID.7': 1.05,
    'Nissan Ariya': 0.95,
  }
  const [selectedVehicle, setSelectedVehicle] = useState<string>('Tesla Model Y')
  const [selectedCost, setSelectedCost] = useState<string>('Phí sạc')
  const [selectedMethod] = useState<'VNPay'>('VNPay')
  const [promoCode, setPromoCode] = useState<string>('')
  const [appliedPromo, setAppliedPromo] = useState<any>(null)
  const [splitMode, setSplitMode] = useState<'ownership'|'usage'>('ownership')
  const [ownershipPercent, setOwnershipPercent] = useState<number>(25)
  // Usage tiers: A (low), B (infrequent), C (frequent)
  const [usageTier, setUsageTier] = useState<'A'|'B'|'C'>('A')
  const usageWeights: Record<'A'|'B'|'C', number> = { A: 0.3, B: 0.6, C: 1.0 }
  const [costShares, setCostShares] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(true)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)
  const [showPaymentCard, setShowPaymentCard] = useState(false)
  const [currentTransactionCode, setCurrentTransactionCode] = useState<string>('')
  const [paymentHistory, setPaymentHistory] = useState<any[]>(() => {
    // Load payment history from localStorage on init
    const saved = localStorage.getItem('vnpay_payment_history')
    return saved ? JSON.parse(saved) : []
  })
  
  // Refs for scrolling
  const paymentCardRef = useRef<HTMLDivElement>(null)
  const historyCardRef = useRef<HTMLDivElement>(null)
  
  useEffect(()=>{ 
    setMockMode(useMockData)
  }, [useMockData])
  
  // Save payment history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('vnpay_payment_history', JSON.stringify(paymentHistory))
  }, [paymentHistory])

  // Check for expired payments (10 minute timeout)
  useEffect(() => {
    const checkExpiredPayments = () => {
      const saved = localStorage.getItem('vnpay_payment_history');
      if (!saved) return;

      const history = JSON.parse(saved);
      const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
      let hasChanges = false;

      const updatedHistory = history.map((payment: any) => {
        // Only check payments that are still processing
        if (payment.status === 'Đang xử lý' || payment.status === 'pending') {
          const createdAt = new Date(payment.timestamp || payment.createdAt);
          const now = new Date();
          const elapsed = now.getTime() - createdAt.getTime();

          // If more than 10 minutes have passed, mark as failed
          if (elapsed > TIMEOUT_MS) {
            console.log(`[Payment Timeout] Payment ${payment.id} expired after ${Math.floor(elapsed / 60000)} minutes`);
            hasChanges = true;
            return {
              ...payment,
              status: 'Thất bại',
              failReason: 'Giao dịch hết hạn (quá 10 phút chưa hoàn thành)',
              expiredAt: new Date().toISOString()
            };
          }
        }
        return payment;
      });

      if (hasChanges) {
        localStorage.setItem('vnpay_payment_history', JSON.stringify(updatedHistory));
        setPaymentHistory(updatedHistory);
        console.log('[Payment Timeout] Expired payments updated');
      }
    };

    // Check immediately on mount
    checkExpiredPayments();

    // Check every 30 seconds
    const interval = setInterval(checkExpiredPayments, 30000);

    return () => clearInterval(interval);
  }, []);

  // Reload payment history when window gains focus (user returns from VNPay)
  useEffect(() => {
    const handleFocus = () => {
      console.log('[App] Window focused, reloading payment history...');
      const saved = localStorage.getItem('vnpay_payment_history');
      if (saved) {
        const history = JSON.parse(saved);
        setPaymentHistory(history);
        console.log('[App] Payment history reloaded:', history);
      }
    };

    // Also listen for storage events (when localStorage changes)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'vnpay_payment_history' && e.newValue) {
        console.log('[App] Storage changed, reloading payment history...');
        setPaymentHistory(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [])

  const baseAmount = costBaseMap[selectedCost] ?? 100000
  const multiplier = vehicleMultiplier[selectedVehicle] ?? 1
  const totalAmount = Math.round(baseAmount * multiplier)
  const amountBeforePromo = splitMode==='ownership'
    ? Math.max(0, Math.round(totalAmount * (isNaN(ownershipPercent)?0:ownershipPercent) / 100))
    : Math.max(0, Math.round(totalAmount * usageWeights[usageTier]))
  
  // Apply promo code discount
  const discountPercent = appliedPromo?.discount || 0
  const discountAmount = Math.round(amountBeforePromo * (discountPercent / 100))
  const amountToPay = amountBeforePromo - discountAmount
  
  const formatVND = (v:number) => v.toLocaleString('vi-VN') + ' ₫'

  // Promo code handlers
  function handleApplyPromo() {
    if (!promoCode.trim()) {
      setError('Vui lòng nhập mã khuyến mãi')
      return
    }

    const upperCode = promoCode.trim().toUpperCase()
    const promo = promoCodesData.promoCodes.find(p => p.code === upperCode)
    
    if (promo) {
      setAppliedPromo(promo)
      setError(null)
      setPaymentSuccess(`✅ Áp dụng mã giảm giá thành công! Giảm ${promo.discount}%`)
      setTimeout(() => setPaymentSuccess(null), 3000)
    } else {
      setAppliedPromo(null)
      setError('❌ Mã khuyến mãi không hợp lệ')
    }
  }

  function handleRemovePromo() {
    setAppliedPromo(null)
    setPromoCode('')
    setPaymentSuccess('Đã xóa mã khuyến mãi')
    setTimeout(() => setPaymentSuccess(null), 2000)
  }

  async function loadCostShares() {
    try {
      setLoading(true); setError(null)
      const data = await getCostSharesByGroup('group-prototype')
      setCostShares(data)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  async function loadPayments() {
    try {
      setLoading(true); setError(null)
      const data = await getPaymentsByUser('user-prototype')
      setPayments(data)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  async function handleCreateCostShare() {
    const payload = {
      groupId: 'group-prototype',
      vehicleId: crypto.randomUUID(),
      costType: 0,
      title: 'Chi phí mẫu',
      totalAmount: 100000,
      dueDate: new Date().toISOString(),
      costShareDetails: []
    }
    try {
      setLoading(true); setError(null)
      await createCostShare(payload)
      await loadCostShares()
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  async function handleCreatePayment() {
    try {
      setLoading(true); setError(null); setPaymentSuccess(null)
      
      // Handle VNPay payment
      if (selectedMethod === 'VNPay') {
        const paymentAmount = amountToPay > 0 ? amountToPay : 10000;
        // Use the current transaction code that was already generated
        const orderId = currentTransactionCode || `ORDER${Date.now()}`;
        const orderInfo = `Thanh toán ${selectedCost} cho ${selectedVehicle}`;
        
        const payload = {
          amount: paymentAmount,
          orderId: orderId,
          orderInfo: orderInfo,
          orderType: 'other',
          locale: 'vn',
          costShareDetailId: crypto.randomUUID(),
          walletId: crypto.randomUUID(),
        };
        
        console.log('[Payment] Creating VNPay payment:', payload);
        
        const res: any = await createVNPayPayment(payload);
        
        if (res.success && res.data?.paymentUrl) {
          console.log('[Payment] Got payment URL, redirecting...');
          
          // Add to payment history with creation timestamp
          const historyItem = {
            id: orderId,
            vehicle: selectedVehicle,
            cost: selectedCost,
            amount: paymentAmount,
            method: 'VNPay',
            status: 'Đang xử lý',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
            discountCode: appliedPromo ? appliedPromo.code : null
          };
          setPaymentHistory(prev => [historyItem, ...prev]);
          
          // Redirect to VNPay
          window.location.href = res.data.paymentUrl;
        } else {
          throw new Error('Không nhận được URL thanh toán');
        }
      }
      
      // Handle other payment methods (fallback)
      const methodMap: Record<string, number> = { 
        'VNPay': 2,
        'Banking': 2, 
        'EWallet': 3, 
        'Cash': 4 
      };
      const methodValue = methodMap[selectedMethod] || 2;
      const paymentAmount = amountToPay > 0 ? amountToPay : 10000;
      const payload = {
        costShareDetailId: crypto.randomUUID(),
        walletId: crypto.randomUUID(),
        method: methodValue,
        amount: paymentAmount,
        currency: 'VND',
      };
      
      const res: any = await createPayment(payload);
      setPaymentSuccess(`Payment created successfully via ${selectedMethod}!`);
      return res;
    } catch (e: any) { 
      setError(e.message || 'Failed to create payment');
    } finally { 
      setLoading(false);
    }
  }

  function handleProceedToPayment() {
    // Generate transaction code when proceeding to payment
    const transactionCode = `ORDER${Date.now()}`
    setCurrentTransactionCode(transactionCode)
    
    setShowPaymentCard(true)
    setActiveTab('payment')
    
    // Scroll to payment card with smooth animation after a short delay
    setTimeout(() => {
      paymentCardRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white/90 backdrop-blur rounded-xl p-6 shadow-lg text-center mb-4">
          <h1 className="text-3xl font-bold text-slate-800">Hệ thống Thanh toán Đồng sở hữu EV</h1>
          <p className="text-slate-500">Quản lý thanh toán và chia sẻ chi phí</p>
        </header>

        <div className="space-y-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-600 text-xl">❌</span>
                <div>
                  <div className="font-semibold text-red-800">Lỗi</div>
                  <div className="text-red-600 text-sm">{error}</div>
                </div>
              </div>
            </div>
          )}
          {paymentSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-green-600 text-xl">✅</span>
                <div>
                  <div className="font-semibold text-green-800">Thành công</div>
                  <div className="text-green-600 text-sm">{paymentSuccess}</div>
                </div>
              </div>
            </div>
          )}

          {/* Card 1: Payment Configuration */}
          <div className="bg-white/95 rounded-xl p-6 shadow-lg card-transition animate-slide-up">
            <h2 className="text-xl font-bold text-slate-800 mb-4">💳 Thông tin thanh toán</h2>
            <div className="space-y-4">
              <div>
                <div className="font-semibold mb-2">1) Chọn xe muốn thanh toán</div>
                <select aria-label="Chọn xe" title="Chọn xe" value={selectedVehicle} onChange={e=>setSelectedVehicle(e.target.value)} className="border rounded px-3 py-2 w-full">
                  {vehicles.map(v=> <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <div className="font-semibold mb-2">2) Chọn khoản chi phí</div>
                <select aria-label="Chọn chi phí" title="Chọn chi phí" value={selectedCost} onChange={e=>setSelectedCost(e.target.value)} className="border rounded px-3 py-2 w-full">
                  {costs.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div className="font-semibold mb-2">3) Nhập mã khuyến mãi (nếu có)</div>
                {!appliedPromo ? (
                  <div className="flex gap-2">
                    <input 
                      value={promoCode} 
                      onChange={e=>setPromoCode(e.target.value.toUpperCase())} 
                      placeholder="Nhập mã giảm giá" 
                      className="border rounded px-3 py-2 flex-1 uppercase"
                      onKeyPress={e => e.key === 'Enter' && handleApplyPromo()}
                    />
                    <button
                      onClick={handleApplyPromo}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
                    >
                      Áp dụng
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🎉</span>
                        <div>
                          <div className="text-sm font-bold text-green-700">
                            Mã giảm giá: {appliedPromo.code}
                          </div>
                          <div className="text-xs text-green-600">
                            {appliedPromo.description}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleRemovePromo}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold transition-colors"
                        title="Xóa mã giảm giá"
                      >
                        ✕ Xóa
                      </button>
                    </div>
                    <div className="mt-2 pt-2 border-t border-green-200 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Giá gốc:</span>
                        <span className="line-through text-slate-500">{formatVND(amountBeforePromo)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Giảm giá ({appliedPromo.discount}%):</span>
                        <span className="text-red-600 font-semibold">-{formatVND(discountAmount)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold">
                        <span className="text-green-700">Giá sau giảm:</span>
                        <span className="text-green-700">{formatVND(amountToPay)}</span>
                      </div>
                      <div className="text-center mt-2 pt-2 border-t border-green-200">
                        <span className="text-xs text-green-600 font-semibold">
                          💰 Bạn tiết kiệm: {formatVND(discountAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="font-semibold mb-2">4) Số tiền phải thanh toán</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="border rounded px-3 py-2 flex items-center gap-2">
                    <input type="radio" name="split" checked={splitMode==='ownership'} onChange={()=>setSplitMode('ownership')} />
                    <span>Theo tỉ lệ sở hữu (%)</span>
                  </label>
                  <label className="border rounded px-3 py-2 flex items-center gap-2">
                    <input type="radio" name="split" checked={splitMode==='usage'} onChange={()=>setSplitMode('usage')} />
                    <span>Theo mức sử dụng</span>
                  </label>
                  <div className="border rounded px-3 py-2 text-slate-700">
                    Tổng chi phí: <span className="font-semibold">{formatVND(totalAmount)}</span>
                  </div>
                </div>
                {splitMode==='ownership' ? (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Tỉ lệ sở hữu (%)</label>
                      <input aria-label="Tỉ lệ sở hữu" title="Tỉ lệ sở hữu" type="number" min={0} max={100} value={ownershipPercent} onChange={e=>setOwnershipPercent(Number(e.target.value))} className="border rounded px-3 py-2 w-full"/>
                    </div>
                    <div className="flex items-end">
                      <div className="w-full border rounded px-3 py-2 bg-slate-50">
                        Bạn trả: <span className="font-semibold">{formatVND(amountToPay)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-600 mb-2">Mức sử dụng</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={()=>setUsageTier('A')} className={`border rounded py-2 ${usageTier==='A'?'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200':'bg-white'}`}>A</button>
                        <button onClick={()=>setUsageTier('B')} className={`border rounded py-2 ${usageTier==='B'?'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200':'bg-white'}`}>B</button>
                        <button onClick={()=>setUsageTier('C')} className={`border rounded py-2 ${usageTier==='C'?'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200':'bg-white'}`}>C</button>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        A: sử dụng thấp • B: sử dụng không thường xuyên • C: sử dụng thường xuyên
                      </div>
                    </div>
                    <div className="flex items-end">
                      <div className="w-full border rounded px-3 py-2 bg-slate-50">
                        Bạn trả: <span className="font-semibold">{formatVND(amountBeforePromo)}</span>
                        {appliedPromo && (
                          <span className="ml-2 text-xs text-green-600">
                            → {formatVND(amountToPay)} (giảm {appliedPromo.discount}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {appliedPromo && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-center">
                  <span className="text-xs text-amber-700 font-semibold">
                    🎁 Tiết kiệm {formatVND(discountAmount)} với mã {appliedPromo.code}!
                  </span>
                </div>
              )}
              <div className="pt-2">
                <button 
                  onClick={handleProceedToPayment} 
                  className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transform hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]"
                >
                  Thanh toán →
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Payment Confirmation (Only shows after clicking Thanh toán) */}
          {showPaymentCard && (
            <div 
              ref={paymentCardRef}
              className="bg-white/95 rounded-xl p-6 shadow-lg card-transition card-highlight animate-scale-in"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-4">💰 Xác nhận thanh toán</h2>
            <div className="space-y-3">
              <div className="text-slate-700">Xe: <span className="font-semibold">{selectedVehicle}</span></div>
              <div className="text-slate-700">Khoản chi phí: <span className="font-semibold">{selectedCost}</span></div>
              <div className="text-slate-700">Tổng chi phí: <span className="font-semibold">{formatVND(totalAmount)}</span></div>
              
              {/* Transaction Code Display */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔖</span>
                    <div>
                      <div className="text-xs text-amber-600 font-semibold uppercase">Mã giao dịch</div>
                      <div className="text-sm font-mono font-bold text-amber-900 mt-0.5">{currentTransactionCode}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentTransactionCode);
                      alert('Đã sao chép mã giao dịch!');
                    }}
                    className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded text-xs font-semibold transition-colors"
                    title="Sao chép mã giao dịch"
                  >
                    📋 Sao chép
                  </button>
                </div>
              </div>
              
              <div className="text-slate-700">
                Phương thức chia sẻ: <span className="font-semibold">
                  {splitMode === 'ownership' 
                    ? `Theo tỉ lệ sở hữu ${ownershipPercent}%` 
                    : `Theo mức sử dụng (${usageTier})`}
                </span>
              </div>
              <div className="bg-indigo-50 border-2 border-indigo-300 rounded-lg p-4 mt-3">
                <div className="text-center">
                  <div className="text-sm text-indigo-600 mb-1">Số tiền bạn phải thanh toán</div>
                  {appliedPromo && amountBeforePromo !== amountToPay && (
                    <div className="text-lg line-through text-slate-400 mb-1">{formatVND(amountBeforePromo)}</div>
                  )}
                  <div className="text-3xl font-bold text-indigo-700">{formatVND(amountToPay > 0 ? amountToPay : 10000)}</div>
                  {appliedPromo && (
                    <div className="mt-2 text-xs text-green-600 font-semibold">
                      🎉 Đã giảm {appliedPromo.discount}% • Tiết kiệm {formatVND(discountAmount)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={handleCreatePayment}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transform hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Đang xử lý...' : `Xác nhận thanh toán ${formatVND(amountToPay > 0 ? amountToPay : 10000)}`}
                </button>
                <button 
                  onClick={() => setShowPaymentCard(false)}
                  disabled={loading}
                  className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transform hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  Hủy
                </button>
              </div>
            </div>
            </div>
          )}

          {/* Card 3: Payment History */}
          <div 
            ref={historyCardRef}
            className="bg-white/95 rounded-xl p-6 shadow-lg card-transition animate-slide-right"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">📜 Lịch sử thanh toán</h2>
              <button
                onClick={() => {
                  if (paymentHistory.length === 0) {
                    alert('Không có lịch sử để xóa')
                    return
                  }
                  if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử thanh toán?')) {
                    setPaymentHistory([])
                    localStorage.removeItem('vnpay_payment_history')
                  }
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transform hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] flex items-center gap-2"
                title="Xóa lịch sử"
              >
                <span>🗑️</span>
                <span>Xóa lịch sử</span>
              </button>
            </div>
            {paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">📋</div>
                <p>Chưa có giao dịch nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((payment, index) => {
                  // Normalize status for display
                  const statusNormalized = payment.status?.toLowerCase().includes('thành công') || payment.status === 'success' ? 'success' :
                                          payment.status?.toLowerCase().includes('đang xử lý') || payment.status === 'pending' ? 'pending' :
                                          'failed';
                  
                  // Get date from either timestamp or completedAt
                  const displayDate = payment.completedAt || payment.timestamp || payment.date;
                  const formattedDate = displayDate ? new Date(displayDate).toLocaleString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }) : 'N/A';
                  
                  // Calculate remaining time for pending payments
                  let remainingTime = '';
                  if (statusNormalized === 'pending' && payment.expiresAt) {
                    const now = new Date().getTime();
                    const expires = new Date(payment.expiresAt).getTime();
                    const remaining = Math.max(0, Math.floor((expires - now) / 1000));
                    const minutes = Math.floor(remaining / 60);
                    const seconds = remaining % 60;
                    remainingTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  }
                  
                  return (
                    <div key={payment.id || index} className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-slate-800">{payment.vehicle}</div>
                          <div className="text-sm text-slate-600">{payment.cost || payment.costType}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-indigo-600">{formatVND(payment.amount)}</div>
                          <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                            statusNormalized === 'success' ? 'bg-green-100 text-green-700' :
                            statusNormalized === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {statusNormalized === 'success' ? '✅ Thành công' :
                             statusNormalized === 'pending' ? '⏳ Đang xử lý' :
                             '❌ Thất bại'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 flex justify-between items-center">
                        <span>Mã: {payment.id}</span>
                        <span>{formattedDate}</span>
                      </div>
                      {statusNormalized === 'pending' && remainingTime && (
                        <div className="mt-2 text-xs">
                          <div className="flex items-center gap-1 text-orange-600">
                            <span>⏰</span>
                            <span>Hết hạn sau: <span className="font-mono font-bold">{remainingTime}</span></span>
                          </div>
                        </div>
                      )}
                      {payment.failReason && statusNormalized === 'failed' && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          ⚠️ {payment.failReason}
                        </div>
                      )}
                      <div className="mt-2 text-xs space-x-2 flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded inline-flex items-center gap-1">
                          💳 {payment.method}
                        </span>
                        {payment.discountCode && (
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded inline-flex items-center gap-1 font-semibold border border-amber-200">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                            </svg>
                            {payment.discountCode}
                          </span>
                        )}
                        {payment.transactionNo && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded inline-flex items-center gap-1">🔖 GD: {payment.transactionNo}</span>
                        )}
                        {payment.bankCode && (
                          <span className="px-2 py-1 bg-green-50 text-green-700 rounded inline-flex items-center gap-1">🏦 {payment.bankCode}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App


