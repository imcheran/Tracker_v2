import React, { useState, useMemo } from 'react';
import { Transaction, Debtor, Debt, SavingsGoal, Subscription, Investment } from '../types';
import { 
  Plus, Wallet, X, TrendingUp, TrendingDown, PieChart as PieIcon,
  CreditCard, Zap, Target, AlertCircle, Edit2, Trash2, ChevronRight,
  Filter, Calendar, DollarSign, Users, Building2, ShoppingCart, Home,
  Menu, ArrowRight, Check
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface FinanceViewProps {
  transactions?: Transaction[];
  onAddTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onMenuClick?: () => void;
}

const FinanceView: React.FC<FinanceViewProps> = ({ 
  transactions = [],
  onAddTransaction,
  onDeleteTransaction,
  onMenuClick 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'budgets'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [month, setMonth] = useState(new Date());

  // Form states
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Calculate totals
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  
  const monthTransactions = transactions.filter(tx =>
    isWithinInterval(parseISO(tx.date || new Date().toISOString()), { start: monthStart, end: monthEnd })
  );

  const income = useMemo(() =>
    monthTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0),
    [monthTransactions]
  );

  const expenses = useMemo(() =>
    monthTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0),
    [monthTransactions]
  );

  const balance = income - expenses;

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthTransactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        const cat = tx.category || 'Other';
        map.set(cat, (map.get(cat) || 0) + (tx.amount || 0));
      });
    return map;
  }, [monthTransactions]);

  const handleAddTransaction = () => {
    if (!amount.trim()) return;

    const newTx: Transaction = {
      id: Date.now().toString(),
      type: type as 'income' | 'expense',
      amount: parseFloat(amount),
      description,
      category,
      date: new Date(date).toISOString(),
      paymentMethod: paymentMethod as 'Cash' | 'Card' | 'Bank' | 'UPI',
    };

    onAddTransaction?.(newTx);
    setAmount('');
    setDescription('');
    setCategory('Food');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setShowAddModal(false);
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    'Food': <ShoppingCart size={20} />,
    'Transport': <ArrowRight size={20} />,
    'Entertainment': <Zap size={20} />,
    'Utilities': <Zap size={20} />,
    'Health': <Plus size={20} />,
    'Shopping': <ShoppingCart size={20} />,
    'Home': <Home size={20} />,
  };

  const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Health', 'Shopping', 'Home', 'Other'];

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onMenuClick && (
              <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800 rounded-full transition-colors md:hidden">
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Finance</h1>
            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold">
              {format(month, 'MMM yyyy')}
            </span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
          {(['overview', 'transactions', 'budgets'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Income */}
              <div className="bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold opacity-90">Income</span>
                  <TrendingUp size={24} className="opacity-80" />
                </div>
                <p className="text-3xl font-bold">${income.toFixed(2)}</p>
                <p className="text-xs opacity-75 mt-2">This month</p>
              </div>

              {/* Expenses */}
              <div className="bg-gradient-to-br from-red-400 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-red-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold opacity-90">Expenses</span>
                  <TrendingDown size={24} className="opacity-80" />
                </div>
                <p className="text-3xl font-bold">${expenses.toFixed(2)}</p>
                <p className="text-xs opacity-75 mt-2">This month</p>
              </div>

              {/* Balance */}
              <div className={`bg-gradient-to-br ${balance >= 0 ? 'from-blue-400 to-indigo-600' : 'from-purple-400 to-pink-600'} rounded-2xl p-6 text-white shadow-lg`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold opacity-90">Balance</span>
                  <Wallet size={24} className="opacity-80" />
                </div>
                <p className="text-3xl font-bold">${balance.toFixed(2)}</p>
                <p className="text-xs opacity-75 mt-2">{balance >= 0 ? 'Surplus' : 'Deficit'}</p>
              </div>
            </div>

            {/* Expense Breakdown */}
            {expensesByCategory.size > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieIcon size={18} />
                    Expense Breakdown
                  </h3>
                </div>
                <div className="space-y-3">
                  {Array.from(expensesByCategory.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amount]) => {
                      const percentage = (amount / expenses) * 100;
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cat}</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">${amount.toFixed(2)}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Recent Transactions</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {monthTransactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{tx.description || tx.category}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{format(parseISO(tx.date || new Date().toISOString()), 'MMM d')}</p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              {monthTransactions.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No transactions this month</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="p-4 space-y-2">
            {monthTransactions.length === 0 ? (
              <div className="text-center py-16">
                <CreditCard size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No transactions yet</p>
              </div>
            ) : (
              monthTransactions
                .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                .map(tx => (
                  <div key={tx.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          tx.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {tx.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{tx.description || tx.category}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{tx.paymentMethod}</p>
                        </div>
                      </div>
                      <p className={`font-bold text-lg ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </p>
                    </div>
                    {onDeleteTransaction && (
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="text-center py-12">
                <Target size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Budget tracking coming soon</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Set spending limits for categories</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {type === 'income' ? 'Add Income' : 'Add Expense'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Type Toggle */}
              <div className="flex gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
                <button
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2.5 rounded-md font-semibold text-sm transition-all ${
                    type === 'expense'
                      ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setType('income')}
                  className={`flex-1 py-2.5 rounded-md font-semibold text-sm transition-all ${
                    type === 'income'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-white font-bold text-lg">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-bold text-slate-900 dark:text-white"
                    autoFocus
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What did you spend on?"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`p-3 rounded-lg text-xs font-semibold transition-all ${
                        category === cat
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-400 ring-2 ring-blue-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium text-sm"
                  >
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Bank</option>
                    <option>UPI</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTransaction}
                  disabled={!amount.trim()}
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Check size={18} className="inline mr-2" />
                  Add Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceView;
