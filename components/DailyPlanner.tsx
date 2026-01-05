
import React from 'react';
import { DailyPlanItem } from '../types';
import { Coffee, CheckSquare } from 'lucide-react';

interface DailyPlannerProps {
  plan: DailyPlanItem[];
  onClose: () => void;
}

export const DailyPlanner: React.FC<DailyPlannerProps> = ({ plan, onClose }) => {
  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 animate-slideIn">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-200">Agenda Diária Otimizada</h2>
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
          Fechar Plano
        </button>
      </div>

      <div className="relative border-l-2 border-indigo-500/20 ml-3 space-y-6 pb-2">
        {plan.map((item, index) => (
          <div key={index} className="ml-6 relative">
            <span className={`absolute -left-[31px] flex items-center justify-center w-8 h-8 rounded-full border-4 border-slate-900 ${item.isBreak ? 'bg-amber-900/50 text-amber-400' : 'bg-indigo-900/50 text-indigo-400'}`}>
               {item.isBreak ? <Coffee className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
            </span>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
               <span className="text-sm font-bold text-slate-500 min-w-[100px]">{item.timeSlot}</span>
               <div className={`p-3 rounded-lg flex-1 text-sm border ${item.isBreak ? 'bg-amber-900/10 text-amber-200 border-amber-500/10' : 'bg-slate-800 text-slate-200 border-slate-700'}`}>
                  {item.activity}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
