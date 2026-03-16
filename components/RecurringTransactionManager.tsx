import React, { useState, useEffect } from 'react';
import { Repeat, Plus, Trash2, ChevronLeft, Play, Pause } from 'lucide-react';
import { RecurringTransaction, Transaction } from '../types';

interface RecurringTransactionManagerProps {
  recurring: RecurringTransaction[];
  onAdd: (r: RecurringTransaction) => void;
  onUpdate: (r: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  onGenerate: (txs: Transaction[]) => void;
  onClose: () => void;
}

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export const RecurringTransactionManager: React.FC<RecurringTransactionManagerProps> = ({
  recurring, onAdd, onUpdate, onDelete, onGenerate, onClose,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [category, setCategory] = useState('Other');
  const [merchant, setMerchant] = useState('');
  const [period, setPeriod] = useState<RecurringTransaction['period']>('monthly');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);

  // Auto-generate due recurring transactions on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const due = recurring.filter(r => r.isActive && r.nextDate <= today);
    if (due.length === 0) return;

    const txs: Transaction[] = due.map(r => ({
      id: `rec-${r.id}-${Date.now()}`,
      istransaction: true,
      amount: r.amount,
      type: r.type,
      merchant: r.merchant || r.title,
      category: r.category,
      paymentmethod: r.paymentmethod,
      date: r.nextDate,
      time: '09:00',
      rawsms: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    onGenerate(txs);

    // Advance nextDate for each
    due.forEach(r => {
      const next = new Date(r.nextDate);
      if (r.period === 'daily') next.setDate(next.getDate() + 1);
      else if (r.period === 'weekly') next.setDate(next.getDate() + 7);
      else if (r.period === 'monthly') next.setMonth(next.getMonth() + 1);
      else if (r.period === 'yearly') next.setFullYear(next.getFullYear() + 1);
      onUpdate({ ...r, nextDate: next.toISOString().split('T')[0] });
    });
  }, [recurring, onGenerate, onUpdate]);

  const handleAdd = () => {
    if (!title || !amount) return;
    onAdd({
      id: Date.now().toString(),
      title, amount: parseFloat(amount), type, category, merchant, paymentmethod: 'Cash',
      period, nextDate, isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    setShowForm(false); setTitle(''); setAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 animate-slide-up">
      <div className="pt-safe shrink-0 border-b border-slate-100 dark:border-slate-800">
        <div className="h-14 flex items-center px-4 gap-3">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex-1">Recurring Transactions</h1>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow">
            <Plus size={14} /> New
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-safe">
        {recurring.map(r => (
          <div key={r.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border ${r.isActive ? 'border-slate-100 dark:border-slate-700' : 'border-dashed border-slate-200 dark:border-slate-700 opacity-60'}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-slate-800 dark:text-white">{r.title}</p>
                <p className="text-xs text-slate-400">{r.merchant} • {r.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdate({ ...r, isActive: !r.isActive })} className={`p-1.5 rounded-lg ${r.isActive ? 'text-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'text-slate-400 bg-slate-100 dark:bg-slate-700'}`}>
                  {r.isActive ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button onClick={() => onDelete(r.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <p className={`text-lg font-bold ${r.type === 'credit' ? 'text-teal-500' : 'text-slate-800 dark:text-slate-200'}`}>
                {r.type === 'credit' ? '+' : '-'}${r.amount.toFixed(2)}
              </p>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-500 flex items-center gap-1 justify-end"><Repeat size={10} /> {r.period}</p>
                <p className="text-[10px] text-slate-400">Next: {r.nextDate}</p>
              </div>
            </div>
          </div>
        ))}

        {showForm && (
          <div className="bg-indigo-50 dark:bg-slate-800 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-900/40 space-y-3 animate-scale-in">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (e.g. Rent)"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none" />
            <div className="flex gap-2">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount"
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none" />
              <select value={type} onChange={e => setType(e.target.value as any)}
                className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none">
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div className="flex gap-2">
              <select value={period} onChange={e => setPeriod(e.target.value as any)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none">
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 text-sm font-bold text-slate-500 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-2 text-sm font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
