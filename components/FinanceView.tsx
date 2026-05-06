import React, { useState, useMemo } from 'react';
import { Transaction, Debt, Debtor, SavingsGoal, Subscription, Investment } from '../types';
import { 
  Target, Users2, Wallet, CreditCard, PieChart, TrendingUp, 
  Plus, MoreHorizontal, DollarSign, Landmark, PiggyBank, Briefcase,
  ArrowUpRight, ArrowDownLeft, Calendar, Repeat, Search
} from 'lucide-react';

// Icons for mapping
const ICON_MAP: any = {
    Target, Wallet, PiggyBank, Briefcase, Landmark, CreditCard, PieChart
};

// Types for props
interface FinanceViewProps {
  transactions: Transaction[];
  partnerTransactions?: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onMenuClick: () => void;
  onAddTransactions?: (txs: Transaction[]) => void;
  
  debtors: Debtor[];
  debts: Debt[];
  onAddDebtor: (d: Debtor) => void;
  onAddDebt: (d: Debt) => void;
  onUpdateDebt: (d: Debt) => void;
  onDeleteDebt: (id: string) => void;
  
  goals: SavingsGoal[];
  partnerGoals?: SavingsGoal[];
  onAddGoal: (g: SavingsGoal) => void;
  onUpdateGoal: (g: SavingsGoal) => void;
  onDeleteGoal: (id: string) => void;

  subscriptions?: Subscription[];
  onAddSubscription?: (s: Subscription) => void;
  onUpdateSubscription?: (s: Subscription) => void;
  onDeleteSubscription?: (id: string) => void;

  investments?: Investment[];
  onAddInvestment?: (i: Investment) => void;
  onUpdateInvestment?: (i: Investment) => void;
  onDeleteInvestment?: (id: string) => void;

  user?: any;
}

const FinanceView: React.FC<FinanceViewProps> = ({ 
    transactions, partnerTransactions = [], onAddTransaction, onUpdateTransaction, onDeleteTransaction, onMenuClick,
    debtors, debts, onAddDebtor, onAddDebt, onUpdateDebt, onDeleteDebt,
    goals, partnerGoals = [], onAddGoal, onUpdateGoal, onDeleteGoal,
    subscriptions = [], onAddSubscription, onUpdateSubscription, onDeleteSubscription,
    investments = [], onAddInvestment, onUpdateInvestment, onDeleteInvestment,
    user
}) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

    const activeGoals = [...goals, ...partnerGoals];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };
    
    return (
        <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="pt-safe bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="h-16 flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                            <MoreHorizontal size={24} />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Finance</h1>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex px-4 gap-6 overflow-x-auto no-scrollbar pb-1">
                    {['overview', 'transactions', 'goals', 'debts'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-bold capitalize transition-colors border-b-2 ${activeTab === tab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg">
                            <div className="text-blue-100 text-sm font-medium mb-1">Total Balance</div>
                            <div className="text-3xl font-bold">{formatCurrency(transactions.reduce((acc, t) => t.type === 'credit' ? acc + t.amount : acc - t.amount, 0))}</div>
                        </div>
                    </div>
                )}

                {activeTab === 'goals' && (
                    <div className="animate-in fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-white">Savings Goals</h3>
                            <button onClick={() => setShowGoalModal(true)} className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">+ Add</button>
                        </div>
                        <div className="space-y-4">
                            {activeGoals.map(g => {
                                const progress = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                                const GIcon = ICON_MAP[g.icon] || Target;
                                const isMine = goals.some(myGoal => myGoal.id === g.id);
                                
                                return (
                                    <div key={g.id} onClick={() => isMine ? setEditingGoal(g) : null} className={`bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 ${isMine ? 'cursor-pointer hover:shadow-md' : 'opacity-90'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm relative" style={{ backgroundColor: g.color }}>
                                                    <GIcon size={20} />
                                                    {!isMine && (
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
                                                            <Users2 size={8} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                        {g.name}
                                                        {!isMine && <span className="text-[9px] bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 rounded font-bold">Partner</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}</div>
                                                </div>
                                            </div>
                                            <span className="font-bold text-lg text-slate-800 dark:text-white">{progress}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: g.color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            
            {showGoalModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowGoalModal(false)}>
                    <div className="bg-white p-4 rounded-lg">Goal Modal (Placeholder)</div>
                </div>
            )}
        </div>
    );
};

export default FinanceView;
