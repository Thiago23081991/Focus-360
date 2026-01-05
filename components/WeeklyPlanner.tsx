
import React from 'react';
import { WeeklyPlanDay } from '../types';
import { CalendarDays, CheckCircle2 } from 'lucide-react';

interface WeeklyPlannerProps {
  plan: WeeklyPlanDay[];
  onClose: () => void;
}

export const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({ plan, onClose }) => {
  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 animate-slideIn">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-500" />
            Planejamento Semanal Equilibrado
        </h2>
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
          Fechar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plan.map((day, index) => (
          <div key={index} className="border border-slate-800 rounded-xl p-4 hover:shadow-lg hover:border-slate-700 transition-all bg-slate-950/30 flex flex-col h-full">
             <div className="border-b border-slate-800 pb-2 mb-3">
                 <h3 className="font-bold text-slate-200">{day.day}</h3>
                 <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{day.focus}</p>
             </div>
             <ul className="space-y-2 flex-1">
                {day.tasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                        <span className="leading-snug">{task}</span>
                    </li>
                ))}
             </ul>
             {day.tasks.length === 0 && (
                 <p className="text-xs text-slate-600 italic mt-2">Dia livre para descanso.</p>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};
