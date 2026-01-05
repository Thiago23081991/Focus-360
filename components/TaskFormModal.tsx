
import React, { useState } from 'react';
import { Priority, Category, Task } from '../types';
import { X, Calendar, Clock, Bell, Tag, AlertTriangle, Type, ArrowRight, Repeat } from 'lucide-react';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<Task>) => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    time: '',
    reminder: '',
    category: Category.OTHER,
    priority: Priority.UNSET
  });
  const [isDailyReminder, setIsDailyReminder] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    onSubmit({
        title: formData.title,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        time: formData.time || undefined,
        reminder: formData.reminder || undefined,
        category: formData.category,
        priority: formData.priority
    });
    
    // Reset and close
    setFormData({
        title: '',
        startDate: '',
        endDate: '',
        time: '',
        reminder: '',
        category: Category.OTHER,
        priority: Priority.UNSET
    });
    setIsDailyReminder(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideIn border border-slate-800">
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs shadow-md shadow-indigo-500/20">360</span>
            Nova Tarefa
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Type className="w-3 h-3" /> Título
            </label>
            <input
              type="text"
              required
              placeholder="O que precisa ser feito?"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Início
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Término
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
          </div>

          {/* Time */}
          <div className="space-y-1">
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                 <Clock className="w-3 h-3" /> Hora / Duração
             </label>
             <input
               type="text"
               placeholder="ex: 14:00 ou 30m"
               className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm placeholder:text-slate-600"
               value={formData.time}
               onChange={(e) => setFormData({...formData, time: e.target.value})}
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Categoria
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
                >
                    {Object.values(Category).map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Prioridade
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value as Priority})}
                >
                    {Object.values(Priority).map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
              </div>
          </div>

          {/* Reminder */}
          <div className="space-y-1 bg-indigo-900/10 p-3 rounded-lg border border-indigo-500/20">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Bell className="w-3 h-3" /> Lembrete
                </label>
                <div className="flex items-center gap-2">
                    <label className="text-[10px] font-medium text-indigo-400 cursor-pointer select-none" htmlFor="recurring-check">
                        Diário
                    </label>
                    <input 
                        id="recurring-check"
                        type="checkbox" 
                        checked={isDailyReminder}
                        onChange={(e) => {
                            setIsDailyReminder(e.target.checked);
                            setFormData({...formData, reminder: ''}); // Clear when switching type
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 bg-slate-900 border-indigo-500/30"
                    />
                    <Repeat className="w-3 h-3 text-indigo-500" />
                </div>
            </div>
            
            <input
              type={isDailyReminder ? "time" : "datetime-local"}
              className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/30 text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={formData.reminder}
              onChange={(e) => setFormData({...formData, reminder: e.target.value})}
            />
            {isDailyReminder && (
                <p className="text-[10px] text-indigo-400 mt-1">
                    {formData.startDate && formData.endDate 
                        ? "O lembrete soará todos os dias entre as datas de Início e Término."
                        : "O lembrete soará todos os dias indefinidamente."}
                </p>
            )}
          </div>

          <div className="pt-4 flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-700 text-slate-400 rounded-xl hover:bg-slate-800 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-medium shadow-lg shadow-indigo-900/40"
              >
                Criar Tarefa
              </button>
          </div>

        </form>
      </div>
    </div>
  );
};
