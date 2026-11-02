import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import {
  Wallet, Smartphone, Building2, Coins, CreditCard, ArrowRight,
  CheckCircle2, Clock, AlertCircle, Copy, Check, ExternalLink,
  Loader2, DollarSign, Info, ShieldCheck, ArrowDownRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSystem } from '../contexts/SystemContext';

export default function AddFundsPage() {
  const { showToast, fetchProfile, user } = useAuth();
  const { formatPrice } = useSystem();

  const [methods, setMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState(null);

  // Form inputs
  const [amount, setAmount] = useState('25.00');
  const [transactionId, setTransactionId] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  useEffect(() => {
    const loadGateways = async () => {
      try {
        setLoadingMethods(true);
        const res = await api.payments.getMethods();
        const list = res.methods || res || [];
        setMethods(list);
        if (list.length > 0) {
          setSelectedMethod(list[0]);
        }
      } catch (err) {
        showToast(err.message || 'Failed to load payment gateways', 'error');
      } finally {
        setLoadingMethods(false);
      }
    };
    loadGateways();
  }, []);

  // Quick amount preset buttons
  const quickAmounts = ['10', '25', '50', '100', '250', '500'];

  const numAmount = parseFloat(amount) || 0;
  const isManual = selectedMethod?.type === 'manual';

  // Fee calculation
  const fixedCharge = parseFloat(selectedMethod?.fixed_charge || 0);
  const percentCharge = parseFloat(selectedMethod?.percentage_charge || 0);
  const calculatedFee = Math.round((fixedCharge + (numAmount * percentCharge / 100)) * 100) / 100;
  const totalUSD = Math.round((numAmount + calculatedFee) * 100) / 100;
  const rate = parseFloat(selectedMethod?.exchange_rate || 1.0);
  const totalLocal = Math.round((totalUSD * rate) * 100) / 100;
  const currencyCode = selectedMethod?.currency || 'USD';

  // Copy recipient account
  const handleCopyAccount = (acc) => {
    if (!acc) return;
    navigator.clipboard.writeText(acc);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMethod) {
      showToast('Please select a payment gateway', 'error');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid deposit amount', 'error');
      return;
    }

    const minLimit = parseFloat(selectedMethod.min_amount || 0);
    const maxLimit = parseFloat(selectedMethod.max_amount || 0);

    if (minLimit > 0 && numAmount < minLimit) {
      showToast(`Minimum deposit for ${selectedMethod.name} is $${minLimit.toFixed(2)}`, 'error');
      return;
    }
    if (maxLimit > 0 && numAmount > maxLimit) {
      showToast(`Maximum deposit for ${selectedMethod.name} is $${maxLimit.toFixed(2)}`, 'error');
      return;
    }

    if (isManual) {
      if (!transactionId.trim()) {
        showToast('Please enter the Transaction ID (TrxID) from your payment receipt', 'error');
        return;
      }
      if (!senderAccount.trim()) {
        showToast('Please enter the Sender Phone or Account number you sent from', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: numAmount,
        method_id: selectedMethod.id,
        method_code: selectedMethod.code,
        transaction_id: transactionId.trim() || undefined,
        payer_details: {
          sender_account: senderAccount.trim() || 'N/A',
          account_type: isManual ? 'manual_mobile_wallet' : 'card_auto'
        },
        payment_proof: paymentProof.trim() || undefined,
        notes: notes.trim() || undefined
      };

      const res = await api.payments.deposit(payload);

      showToast(res.message || 'Deposit processed successfully!');
      setReceiptData({
        payment: res.payment,
        is_manual: res.is_manual,
        receipt_id: res.receipt_id,
        status: res.status,
        new_balance: res.new_balance,
        credited_amount: numAmount,
        fee: calculatedFee,
        local_amount: totalLocal,
        currency: currencyCode
      });

      // Reset form
      setTransactionId('');
      setSenderAccount('');
      setPaymentProof('');
      setNotes('');

      if (fetchProfile) fetchProfile();
    } catch (err) {
      showToast(err.message || 'Failed to submit deposit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Icon selector based on gateway code
  const getGatewayIcon = (code) => {
    if (code.includes('bkash') || code.includes('nagad') || code.includes('rocket')) return Smartphone;
    if (code.includes('binance') || code.includes('crypto')) return Coins;
    if (code.includes('bank')) return Building2;
    return CreditCard;
  };

  const getGatewayColor = (code) => {
    if (code.includes('bkash')) return '#E2136E';
    if (code.includes('nagad')) return '#F6921E';
    if (code.includes('rocket')) return '#8B3A9F';
    if (code.includes('binance')) return '#F0B90B';
    if (code.includes('stripe')) return '#6366f1';
    if (code.includes('paypal')) return '#0079C1';
    return '#3b82f6';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Wallet className="w-8 h-8 text-primary-500" />
            Add Funds to Wallet
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose your preferred automatic gateway or local Bangladesh payment method
          </p>
        </div>

        {/* Current Wallet Balance Badge */}
        <div className="bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-primary-500/25 flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-white/80">Available Balance</div>
            <div className="text-xl font-black">{formatPrice(user?.balance || 0)}</div>
          </div>
        </div>
      </div>

      {loadingMethods ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
          <p className="text-sm">Loading payment gateways...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Gateway Selection Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                1. Select Payment Method
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {methods.map((method) => {
                  const Icon = getGatewayIcon(method.code);
                  const isSelected = selectedMethod?.id === method.id;
                  const brandColor = getGatewayColor(method.code);

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method)}
                      className={`relative p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 ring-2 ring-primary-500/30 shadow-md'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                          style={{ backgroundColor: brandColor }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                          {method.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            method.type === 'automatic'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}>
                            {method.type === 'automatic' ? 'Instant' : 'Manual Review'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {method.currency}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gateway Instructions Box */}
            {selectedMethod && (
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary-500" />
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedMethod.name} Instructions
                    </h4>
                  </div>
                  {isManual && selectedMethod.parameters?.merchant_account && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">Recipient Account:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount(selectedMethod.parameters.merchant_account)}
                        className="font-mono text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded-lg hover:bg-primary-100 flex items-center gap-1 transition-all"
                      >
                        {selectedMethod.parameters.merchant_account}
                        {copiedAccount ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  {selectedMethod.instructions || 'Follow the instructions provided by your payment provider to complete the transaction.'}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="flex justify-between p-2.5 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-400">Limits:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ${parseFloat(selectedMethod.min_amount).toFixed(2)} - ${parseFloat(selectedMethod.max_amount).toFixed(2)} USD
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-400">Exchange Rate:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      1 USD = {selectedMethod.exchange_rate} {currencyCode}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Deposit Calculator & Form (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 sm:p-7 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Deposit Details
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Amount Input */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      Deposit Amount (USD) *
                    </label>
                    <span className="text-xs text-slate-400">
                      Min: ${parseFloat(selectedMethod?.min_amount || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="relative">
                    <DollarSign className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="50.00"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Quick Amount Pills */}
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {quickAmounts.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(q)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          amount === q
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        ${q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculation Breakdown Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Credit to Balance:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">${numAmount.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Gateway Surcharge Fee:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">+${calculatedFee.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Total Charge (USD):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">${totalUSD.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-sm text-slate-900 dark:text-white">
                    <span>Total in {currencyCode}:</span>
                    <span className="text-primary-600 font-extrabold">{totalLocal.toFixed(2)} {currencyCode}</span>
                  </div>
                </div>

                {/* Manual Proof Inputs */}
                {isManual && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Your Sender Phone / Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={senderAccount}
                        onChange={(e) => setSenderAccount(e.target.value)}
                        placeholder="e.g. 01711-XXXXXX or wallet address"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Transaction ID (TrxID) *
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g. 9J4K2L8P91"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Screenshot / Receipt Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={paymentProof}
                        onChange={(e) => setPaymentProof(e.target.value)}
                        placeholder="https://imgur.com/your-proof.jpg"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || numAmount <= 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-lg shadow-primary-500/25 font-bold text-sm transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Deposit ${numAmount.toFixed(2)} via {selectedMethod?.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 text-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>256-bit SSL encrypted. Atomic financial ledger guaranteed.</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS / PENDING RECEIPT MODAL */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 sm:p-8 my-8 text-center">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 ${
              receiptData.is_manual
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
            }`}>
              {receiptData.is_manual ? <Clock className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {receiptData.is_manual ? 'Deposit Request Submitted!' : 'Deposit Successful!'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {receiptData.is_manual
                ? 'Your deposit has been placed into the review queue. Once verified by our financial team, your wallet will be credited.'
                : 'Your payment was verified instantly and your wallet balance has been updated.'}
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 my-6 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt Reference</span>
                <span className="font-mono font-bold text-primary-600">{receiptData.receipt_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Credited Amount</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">${receiptData.credited_amount.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Charged</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {receiptData.local_amount.toFixed(2)} {receiptData.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className={`font-bold capitalize ${receiptData.is_manual ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {receiptData.status}
                </span>
              </div>
              {!receiptData.is_manual && (
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-slate-900 dark:text-white text-sm">
                  <span>Updated Balance</span>
                  <span className="text-emerald-600">${parseFloat(receiptData.new_balance || 0).toFixed(2)} USD</span>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-200"
              >
                Close
              </button>
              <Link
                to="/dashboard/payments"
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-500/20"
              >
                View Payment History
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
