
import React, { useState } from 'react';
import { Task, Priority, Category } from '../types';
import { CheckCircle2, Circle, Clock, Tag, AlertTriangle, PlayCircle, Split, Bell, BellRing, X, GripVertical, Repeat, Inbox } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onBreakdown: (id: string) => void;
  onMotivate: (task: Task) => void;
  onSetReminder: (id: string, time: string | undefined) => void;
  onUpdatePriority: (id: string, priority: Priority) => void;
  loadingBreakdown: string | null;
}

const categoryIcons = {
  [Category.WORK]: '💼',
  [Category.STUDY]: '📚',
  [Category.PERSONAL]: '🏠',
  [Category.FINANCE]: '💰',
  [Category.HEALTH]: '💪',
  [Category.OTHER]: '📌',
};

// Helper format function
const formatReminder = (isoString: string) => {
    if (!isoString.includes('T')) {
        // It's just HH:MM (Daily)
        return `Diariamente às ${isoString}`;
    }
    
    const date = new Date(isoString);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Hoje às ${time}`;
    return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`;
};

export const TaskList: React.FC<TaskListProps> = ({ tasks, onToggle, onDelete, onBreakdown, loadingBreakdown, onMotivate, onSetReminder, onUpdatePriority }) => {
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Group tasks
  const unsetTasks = tasks.filter(t => t.priority === Priority.UNSET && !t.completed);
  const criticalTasks = tasks.filter(t => t.priority === Priority.CRITICAL && !t.completed);
  const importantTasks = tasks.filter(t => t.priority === Priority.IMPORTANT && !t.completed);
  const canWaitTasks = tasks.filter(t => t.priority === Priority.CAN_WAIT && !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.setData('taskId', taskId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, priority: Priority) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
          onUpdatePriority(taskId, priority);
      }
      setDraggedTaskId(null);
  };

  const renderTaskCard = (task: Task) => (
    <div 
      key={task.id} 
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      className={`bg-slate-800 p-3 rounded-xl border border-slate-700/50 shadow-md hover:shadow-xl hover:border-slate-600 transition-all cursor-grab active:cursor-grabbing group relative ${draggedTaskId === task.id ? 'opacity-40 grayscale' : ''}`}
    >
        <div className="flex items-start gap-3">
             <div className="mt-1 text-slate-600 cursor-grab active:cursor-grabbing hover:text-indigo-400 transition-colors">
                <GripVertical className="w-4 h-4" />
            </div>
            <button onClick={() => onToggle(task.id)} className="mt-0.5 text-slate-600 hover:text-emerald-500 transition-colors">
                 <Circle className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h3 className="font-medium text-slate-200 text-sm leading-snug break-words">{task.title}</h3>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => onDelete(task.id)} className="text-slate-600 hover:text-red-400 p-1"><X className="w-3 h-3" /></button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 text-[10px] flex items-center gap-1 font-medium">
                        {categoryIcons[task.category]} {task.category}
                    </span>
                    {(task.startDate || task.endDate || task.time) && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 text-[10px] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {task.endDate || task.time}
                      </span>
                    )}
                    {task.reminder && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] flex items-center gap-1">
                        {!task.reminder.includes('T') ? <Repeat className="w-2.5 h-2.5" /> : <BellRing className="w-2.5 h-2.5" />}
                        {formatReminder(task.reminder)}
                      </span>
                    )}
                </div>

                {/* Inline Actions */}
                <div className="flex items-center gap-1 mt-3 border-t border-slate-700/50 pt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingReminder(editingReminder === task.id ? null : task.id)} className={`p-1.5 rounded-md hover:bg-slate-700 ${task.reminder ? 'text-indigo-400' : 'text-slate-500'}`} title="Lembrete">
                        <Bell className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onMotivate(task)} className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-indigo-400" title="Motivação IA">
                        <PlayCircle className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onBreakdown(task.id)} className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-indigo-400" title="Dividir Tarefa">
                        {loadingBreakdown === task.id ? <div className="animate-spin w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full"/> : <Split className="w-3.5 h-3.5" />}
                    </button>
                </div>
                
                 {/* Reminder Input Form (Inline) */}
                 {editingReminder === task.id && (
                    <div className="mt-3 bg-slate-900 p-2 rounded-lg text-xs z-10 relative border border-slate-700 animate-slideIn">
                        <p className="text-[10px] text-slate-400 mb-1">Definir lembrete (Data/Hora):</p>
                        <input 
                            type="datetime-local" 
                            defaultValue={task.reminder?.includes('T') ? task.reminder : ''}
                            onChange={(e) => { if(e.target.value) { onSetReminder(task.id, e.target.value); setEditingReminder(null); }}}
                            className="w-full bg-slate-800 border border-slate-600 text-slate-200 rounded px-2 py-1.5 mb-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                         <p className="text-[10px] text-slate-400 mb-1 mt-1">Ou Diário (Hora):</p>
                         <input 
                            type="time" 
                            defaultValue={!task.reminder?.includes('T') ? task.reminder : ''}
                            onChange={(e) => { if(e.target.value) { onSetReminder(task.id, e.target.value); setEditingReminder(null); }}}
                            className="w-full bg-slate-800 border border-slate-600 text-slate-200 rounded px-2 py-1.5 mb-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <div className="flex justify-between mt-2 border-t border-slate-800 pt-2">
                            <button onClick={() => { onSetReminder(task.id, undefined); setEditingReminder(null); }} className="text-red-400 hover:text-red-300 hover:underline">Remover</button>
                            <button onClick={() => setEditingReminder(null)} className="text-slate-400 hover:text-slate-200">Fechar</button>
                        </div>
                    </div>
                )}
                
                {/* Subtasks */}
                {task.subtasks && task.subtasks.length > 0 && (
                     <div className="mt-3 pl-2 border-l-2 border-slate-700 space-y-1">
                         {task.subtasks.map(st => (
                             <div key={st.id} className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                <div className="w-1 h-1 bg-slate-600 rounded-full" /> {st.title}
                             </div>
                         ))}
                     </div>
                )}
            </div>
        </div>
    </div>
  );

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-900 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-slate-400 font-medium">Tudo limpo por aqui.</p>
        <p className="text-slate-600 text-sm mt-1">Adicione uma nova tarefa para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Backlog / Inbox Zone */}
      {(unsetTasks.length > 0 || draggedTaskId) && (
          <div 
             onDragOver={handleDragOver}
             onDrop={(e) => handleDrop(e, Priority.UNSET)}
             className={`p-4 rounded-2xl border transition-all duration-300 ${
                 draggedTaskId 
                    ? 'bg-slate-900/80 border-dashed border-indigo-500/50 ring-2 ring-indigo-500/20' 
                    : 'bg-slate-900/30 border-slate-800'
             }`}
          >
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                 <Inbox className="w-4 h-4" />
                 Triagem / Entrada
                 <span className="text-slate-600 font-normal ml-auto text-[10px] bg-slate-800 px-2 py-0.5 rounded-full">
                    {draggedTaskId ? 'Solte para remover prioridade' : `${unsetTasks.length} tarefas`}
                 </span>
             </h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-h-[60px]">
                 {unsetTasks.map(t => renderTaskCard(t))}
                 {unsetTasks.length === 0 && draggedTaskId && (
                     <div className="col-span-full h-16 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500 italic bg-slate-900/50">
                        Voltar para a Triagem
                     </div>
                 )}
             </div>
          </div>
      )}

      {/* 2. Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px]">
          
          {/* Critical Column */}
          <div 
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, Priority.CRITICAL)}
            className={`flex flex-col h-full rounded-2xl border transition-all duration-300 ${
                draggedTaskId 
                    ? 'bg-red-950/20 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                    : 'bg-slate-900/40 border-slate-800/50'
            }`}
          >
              <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md rounded-t-2xl z-10">
                  <span className="font-bold text-red-400 flex items-center gap-2 text-sm tracking-tight">
                      <div className="w-2 h-8 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                      Crítica
                  </span>
                  <span className="bg-red-500/10 text-red-400 text-xs px-2.5 py-1 rounded-full font-bold border border-red-500/20">{criticalTasks.length}</span>
              </div>
              <div className="p-3 flex-1 space-y-3 overflow-y-auto">
                  {criticalTasks.map(t => renderTaskCard(t))}
                  {criticalTasks.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 text-xs gap-2">
                          <AlertTriangle className="w-5 h-5 opacity-20" />
                          <span>Solte itens críticos aqui</span>
                      </div>
                  )}
              </div>
          </div>

          {/* Important Column */}
          <div 
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, Priority.IMPORTANT)}
            className={`flex flex-col h-full rounded-2xl border transition-all duration-300 ${
                draggedTaskId 
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                    : 'bg-slate-900/40 border-slate-800/50'
            }`}
          >
              <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md rounded-t-2xl z-10">
                  <span className="font-bold text-amber-400 flex items-center gap-2 text-sm tracking-tight">
                      <div className="w-2 h-8 rounded-full bg-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                      Importante
                  </span>
                  <span className="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full font-bold border border-amber-500/20">{importantTasks.length}</span>
              </div>
              <div className="p-3 flex-1 space-y-3 overflow-y-auto">
                  {importantTasks.map(t => renderTaskCard(t))}
                  {importantTasks.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 text-xs gap-2">
                          <Tag className="w-5 h-5 opacity-20" />
                          <span>Solte itens importantes aqui</span>
                      </div>
                  )}
              </div>
          </div>

          {/* Can Wait Column */}
          <div 
             onDragOver={handleDragOver}
             onDrop={(e) => handleDrop(e, Priority.CAN_WAIT)}
             className={`flex flex-col h-full rounded-2xl border transition-all duration-300 ${
                draggedTaskId 
                    ? 'bg-blue-950/20 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                    : 'bg-slate-900/40 border-slate-800/50'
            }`}
          >
              <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md rounded-t-2xl z-10">
                  <span className="font-bold text-blue-400 flex items-center gap-2 text-sm tracking-tight">
                      <div className="w-2 h-8 rounded-full bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                      Pode Esperar
                  </span>
                  <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-full font-bold border border-blue-500/20">{canWaitTasks.length}</span>
              </div>
              <div className="p-3 flex-1 space-y-3 overflow-y-auto">
                  {canWaitTasks.map(t => renderTaskCard(t))}
                  {canWaitTasks.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 text-xs gap-2">
                          <Clock className="w-5 h-5 opacity-20" />
                          <span>Solte itens de baixa prioridade</span>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Completed Section */}
      {completedTasks.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800">
             <h4 className="text-sm font-semibold text-slate-500 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Concluídas ({completedTasks.length})
             </h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60 hover:opacity-100 transition-opacity">
                 {completedTasks.map(task => (
                     <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <button onClick={() => onToggle(task.id)} className="text-emerald-500 hover:text-emerald-400"><CheckCircle2 className="w-5 h-5" /></button>
                        <span className="line-through text-slate-500 text-sm flex-1 truncate">{task.title}</span>
                        <button onClick={() => onDelete(task.id)} className="text-slate-600 hover:text-red-400"><X className="w-4 h-4" /></button>
                     </div>
                 ))}
             </div>
          </div>
      )}
    </div>
  );
};
