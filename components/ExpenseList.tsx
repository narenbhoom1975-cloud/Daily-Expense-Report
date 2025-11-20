import React from 'react';
import { ExpenseResponse } from '../types';
import { ICONS } from '../constants';

interface ExpenseListProps {
  data: ExpenseResponse;
  onReset: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ data, onReset }) => {
  
  const downloadCSV = () => {
    const headers = ['Item', 'Category', 'Amount'];
    const rows = data.expenses.map(e => [e.item, e.category, e.amount]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n")
      + `\nTOTAL,,${data.totalAmount}`;
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="relative z-10">
          <p className="text-indigo-100 text-sm uppercase tracking-wider font-semibold mb-1">Total Expense</p>
          <h2 className="text-4xl font-bold">
            {data.currency === 'INR' ? '₹' : '$'}{data.totalAmount.toLocaleString()}
          </h2>
          <div className="mt-4 flex gap-2 flex-wrap">
             {data.expenses.length > 0 && (
               <span className="bg-white/20 backdrop-blur-md text-xs px-3 py-1 rounded-full">
                 {data.expenses.length} items found
               </span>
             )}
             <span className="bg-white/20 backdrop-blur-md text-xs px-3 py-1 rounded-full">
               AI Verified
             </span>
          </div>
        </div>
      </div>

      {/* Transcription & Translation */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Original Audio Text</h3>
          <p className="text-slate-800 text-sm leading-relaxed">{data.transcription}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">English Translation</h3>
          <p className="text-slate-800 text-sm leading-relaxed">{data.translation}</p>
        </div>
      </div>

      {/* Detailed List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">Itemized Expenses</h3>
          <button 
            onClick={downloadCSV}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
          >
            <ICONS.Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        
        <div className="divide-y divide-slate-100">
          {data.expenses.map((expense, idx) => (
            <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-medium text-slate-800 capitalize">{expense.item}</p>
                  <p className="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md inline-block mt-1">
                    {expense.category}
                  </p>
                </div>
              </div>
              <p className="font-bold text-slate-700">
                {data.currency === 'INR' ? '₹' : '$'}{expense.amount.toLocaleString()}
              </p>
            </div>
          ))}
          
          {data.expenses.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              No specific items extracted, but audio was processed.
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors px-6 py-3 rounded-full border border-slate-200 hover:border-red-200 bg-white hover:bg-red-50"
        >
          <ICONS.Trash className="w-4 h-4" />
          Clear & Record New
        </button>
      </div>
    </div>
  );
};