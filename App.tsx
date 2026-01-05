import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority, Category, DailyPlanItem, WeeklyPlanDay } from './types';
import { TaskList } from './components/TaskList';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { DailyPlanner } from './components/DailyPlanner';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { TaskFormModal } from './components/TaskFormModal';
import { parseTaskFromInput, prioritizeTasksAI, generateDailyPlan, generateWeeklyPlan, breakDownTask, getMotivationalMessage } from './services/geminiService';
import { Plus, Wand2, BarChart2, Calendar, Layout, Loader2, Sparkles, BellRing, SlidersHorizontal, CalendarDays } from 'lucide-react';

const initialTasks: Task[] = [];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'analytics'>('tasks');
  const [dailyPlan, setDailyPlan] = useState<DailyPlanItem[] | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanDay[] | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingPriority, setLoadingPriority] = useState(false);
  const [loadingBreakdown, setLoadingBreakdown] = useState<string | null>(null);
  const [motivationalMsg, setMotivationalMsg] = useState<{id: string, msg: string} | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastNotifiedMinute, setLastNotifiedMinute] = useState<string | null>(null);

  // Referência para o contexto de áudio (para evitar recriação e bloqueio de autoplay)
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Inicializa o contexto de áudio na primeira interação do usuário
  useEffect(() => {
    const initAudio = () => {
        if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                audioCtxRef.current = new AudioContext();
            }
        }
        // Tenta resumir se estiver suspenso (comum em navegadores que bloqueiam autoplay)
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => {});
        }
    };

    const handleInteraction = () => {
        initAudio();
        // Remove listeners após a primeira interação bem-sucedida se o contexto estiver rodando
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
             window.removeEventListener('click', handleInteraction);
             window.removeEventListener('keydown', handleInteraction);
             window.removeEventListener('touchstart', handleInteraction);
        }
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const playBellSound = () => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      try {
        if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.error("Audio resume error", e));
        }

        const t = ctx.currentTime;
        
        // Oscilador Principal (Fundamental)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(784, t); // G5
        osc1.frequency.exponentialRampToValueAtTime(784, t + 1);
        
        gain1.gain.setValueAtTime(0, t);
        gain1.gain.linearRampToValueAtTime(0.2, t + 0.05); // Ataque suave
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.5); // Decaimento longo

        osc1.start(t);
        osc1.stop(t + 1.5);

        // Oscilador Secundário (Harmônico para brilho)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.type = 'triangle'; // Timbre mais metálico
        osc2.frequency.setValueAtTime(1568, t); // G6
        
        gain2.gain.setValueAtTime(0, t);
        gain2.gain.linearRampToValueAtTime(0.05, t + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

        osc2.start(t);
        osc2.stop(t + 1.0);

      } catch (e) {
          console.error("Erro ao reproduzir som:", e);
      }
  };

  // Load from local storage on mount (mock persistence)
  useEffect(() => {
    const saved = localStorage.getItem('focus-360-tasks');
    if (saved) {
      try { setTasks(JSON.parse(saved)); } catch (e) {}
    }

    // Check notification permission
    if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(perm => setNotificationPermission(perm));
        }
    }
  }, []);

  // Save on change
  useEffect(() => {
    localStorage.setItem('focus-360-tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Reminder Check Loop (Verifica a cada 5 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
        const now = new Date();
        const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const currentISOMinute = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
        
        // Evitar notificações duplicadas no mesmo minuto
        if (currentISOMinute === lastNotifiedMinute) return;
        
        // Get local YYYY-MM-DD for comparison
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const currentLocalDATE = `${year}-${month}-${day}`;

        let soundPlayedThisCycle = false;

        tasks.forEach(task => {
            if (!task.completed && task.reminder) {
                let shouldNotify = false;

                if (task.reminder.includes('T')) {
                    // Full ISO timestamp (Specific Date and Time)
                    if (task.reminder === currentISOMinute) {
                        shouldNotify = true;
                    }
                } else {
                    // Simple Time (HH:MM) - Could be daily forever OR daily within a range
                    if (task.reminder === currentTime) {
                        if (task.startDate && task.endDate) {
                            // Check if today is within range (inclusive)
                            if (currentLocalDATE >= task.startDate && currentLocalDATE <= task.endDate) {
                                shouldNotify = true;
                            }
                        } else {
                            // No range defined, assume daily forever
                            shouldNotify = true;
                        }
                    }
                }

                if (shouldNotify) {
                    // Tocar som apenas uma vez por ciclo de verificação (mesmo se houver múltiplas tarefas)
                    if (!soundPlayedThisCycle) {
                        playBellSound();
                        soundPlayedThisCycle = true;
                        setLastNotifiedMinute(currentISOMinute);
                    }

                    if (notificationPermission === 'granted') {
                        new Notification(`Lembrete: ${task.title}`, {
                            body: `É hora da tarefa: ${task.title}`,
                            icon: '/favicon.ico' // fallback
                        });
                    } else {
                        setMotivationalMsg({ id: task.id, msg: `Lembrete: ${task.title}` });
                        setTimeout(() => setMotivationalMsg(null), 5000);
                    }
                }
            }
        });
    }, 5000); // Check more frequently to not miss the minute start

    return () => clearInterval(interval);
  }, [tasks, notificationPermission, lastNotifiedMinute]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsProcessing(true);
    try {
      // 1. Parse natural language
      const parsed = await parseTaskFromInput(inputValue);
      
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: parsed.title || inputValue,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        time: parsed.time,
        reminder: parsed.reminder,
        priority: (parsed.priority as Priority) || Priority.UNSET,
        category: (parsed.category as Category) || Category.OTHER,
        completed: false
      };

      setTasks(prev => [newTask, ...prev]);
      setInputValue('');
    } catch (error) {
      console.error("Failed to parse task", error);
      // Fallback
      setTasks(prev => [{
        id: crypto.randomUUID(),
        title: inputValue,
        priority: Priority.UNSET,
        category: Category.OTHER,
        completed: false
      }, ...prev]);
      setInputValue('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualAddTask = (taskData: Partial<Task>) => {
      const newTask: Task = {
          id: crypto.randomUUID(),
          title: taskData.title || 'Nova Tarefa',
          startDate: taskData.startDate,
          endDate: taskData.endDate,
          time: taskData.time,
          reminder: taskData.reminder,
          priority: taskData.priority || Priority.UNSET,
          category: taskData.category || Category.OTHER,
          completed: false,
          subtasks: []
      };
      setTasks(prev => [newTask, ...prev]);
      
      // Request permission if a reminder was set
      if (taskData.reminder && notificationPermission === 'default') {
        Notification.requestPermission().then(p => setNotificationPermission(p));
      }
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSetReminder = (id: string, time: string | undefined) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, reminder: time } : t));
      
      if (time && notificationPermission === 'default') {
          Notification.requestPermission().then(p => setNotificationPermission(p));
      }
  };

  const handleUpdatePriority = (id: string, newPriority: Priority) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, priority: newPriority } : t));
  };

  const handleAutoPrioritize = async () => {
    if (tasks.length === 0) return;
    setLoadingPriority(true);
    try {
      const prioritized = await prioritizeTasksAI(tasks);
      setTasks(prev => prev.map(t => {
        const found = prioritized.find(p => p.id === t.id);
        return found ? { ...t, priority: found.priority } : t;
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPriority(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (tasks.filter(t => !t.completed).length === 0) return;
    setLoadingPlan(true);
    setDailyPlan(null);
    setWeeklyPlan(null);
    try {
      const plan = await generateDailyPlan(tasks);
      setDailyPlan(plan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleGenerateWeeklyPlan = async () => {
      if (tasks.filter(t => !t.completed).length === 0) return;
      setLoadingWeekly(true);
      setDailyPlan(null);
      setWeeklyPlan(null);
      try {
          const plan = await generateWeeklyPlan(tasks);
          setWeeklyPlan(plan);
      } catch (err) {
          console.error(err);
      } finally {
          setLoadingWeekly(false);
      }
  };

  const handleBreakdown = async (id: string) => {
     const task = tasks.find(t => t.id === id);
     if(!task) return;
     setLoadingBreakdown(id);
     try {
        const subtaskTitles = await breakDownTask(task.title);
        const subtasks: Task[] = subtaskTitles.map(title => ({
            id: crypto.randomUUID(),
            title,
            priority: Priority.UNSET,
            category: task.category,
            completed: false
        }));
        
        setTasks(prev => prev.map(t => t.id === id ? { ...t, subtasks } : t));
     } catch (err) {
        console.error(err);
     } finally {
        setLoadingBreakdown(null);
     }
  };

  const handleMotivation = async (task: Task) => {
      setMotivationalMsg(null);
      try {
          const msg = await getMotivationalMessage(task);
          setMotivationalMsg({ id: task.id, msg });
          // Auto clear after 5s
          setTimeout(() => setMotivationalMsg(null), 5000);
      } catch (err) {
          console.error(err);
      }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification for Motivation/Reminders */}
      {motivationalMsg && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-indigo-600 text-white px-6 py-4 rounded-xl shadow-lg shadow-indigo-900/50 flex items-center gap-3 max-w-sm border border-indigo-500/50">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              <div>
                <p className="font-bold text-sm text-indigo-200">Focus 360 AI</p>
                <p className="font-medium">"{motivationalMsg.msg}"</p>
              </div>
          </div>
      )}

      {/* Sidebar / Navigation */}
      <nav className="fixed md:left-0 md:top-0 md:w-64 md:h-full w-full h-16 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 z-40 flex md:flex-col items-center md:items-start justify-between md:justify-start px-4 md:py-6 shadow-xl">
        <div className="flex items-center gap-2 mb-0 md:mb-10">
           <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">360</div>
           <h1 className="text-xl font-bold tracking-tight text-white">Focus 360</h1>
        </div>
        
        <div className="flex md:flex-col gap-2 md:w-full">
            <button 
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all md:w-full ${activeTab === 'tasks' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
                <Layout className="w-5 h-5" />
                <span className="hidden md:inline">Painel</span>
            </button>
            <button 
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all md:w-full ${activeTab === 'analytics' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
                <BarChart2 className="w-5 h-5" />
                <span className="hidden md:inline">Análises</span>
            </button>
        </div>

        <div className="hidden md:block mt-auto w-full pt-6 border-t border-slate-800">
           <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-2 text-slate-200">
                <BellRing className="w-4 h-4 text-indigo-400" /> Notificações
              </h4>
              <p className="text-xs text-slate-400 opacity-90">
                {notificationPermission === 'granted' ? 'Ativadas' : 'Permissão necessária'}
              </p>
           </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 md:pt-6 md:pl-72 pr-4 pb-20 max-w-6xl mx-auto">
         
         {activeTab === 'tasks' && (
             <div className="space-y-6">
                 {/* Header & Actions */}
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                     <div>
                        <h2 className="text-2xl font-bold text-white">Minhas Tarefas</h2>
                        <p className="text-slate-400 text-sm">Organize seu dia com foco total.</p>
                     </div>
                     <div className="flex flex-wrap gap-2">
                         <button 
                            onClick={handleAutoPrioritize}
                            disabled={loadingPriority || tasks.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-700 hover:border-slate-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            {loadingPriority ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-indigo-400" />}
                            Priorizar
                         </button>
                         <button 
                            onClick={handleGeneratePlan}
                            disabled={loadingPlan || tasks.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-700 hover:border-slate-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            {loadingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4 text-indigo-400" />}
                            Planejar Dia
                         </button>
                         <button 
                            onClick={handleGenerateWeeklyPlan}
                            disabled={loadingWeekly || tasks.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white border border-indigo-500 rounded-lg text-sm font-medium hover:bg-indigo-500 shadow-lg shadow-indigo-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            {loadingWeekly ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                            Planejar Semana
                         </button>
                     </div>
                 </div>

                 {/* Input Area (Hybrid: AI Text + Manual Modal) */}
                 <div className="bg-slate-900 p-2 rounded-2xl shadow-lg border border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
                     <form onSubmit={handleAddTask} className="flex gap-2">
                         <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Digite IA (ex: 'Pagar conta hoje') ou use o botão para detalhar..."
                            className="flex-1 px-4 py-3 outline-none text-slate-200 bg-transparent min-w-0 placeholder:text-slate-500"
                            disabled={isProcessing}
                         />
                         
                         {/* Button to open Manual Modal */}
                         <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors"
                            title="Adicionar Manualmente (Detalhado)"
                         >
                             <SlidersHorizontal className="w-5 h-5" />
                         </button>

                         {/* AI Submit Button */}
                         <button 
                            type="submit" 
                            disabled={isProcessing || !inputValue.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 sm:px-6 font-medium transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg shadow-indigo-900/20"
                            title="Adicionar com IA"
                         >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                         </button>
                     </form>
                 </div>

                 {/* Manual Task Modal */}
                 <TaskFormModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onSubmit={handleManualAddTask} 
                 />

                 {/* Daily Plan View (Conditional) */}
                 {dailyPlan && (
                     <DailyPlanner plan={dailyPlan} onClose={() => setDailyPlan(null)} />
                 )}

                 {/* Weekly Plan View (Conditional) */}
                 {weeklyPlan && (
                     <WeeklyPlanner plan={weeklyPlan} onClose={() => setWeeklyPlan(null)} />
                 )}

                 {/* Task List (Kanban) */}
                 <TaskList 
                    tasks={tasks} 
                    onToggle={toggleTask} 
                    onDelete={deleteTask}
                    onBreakdown={handleBreakdown}
                    loadingBreakdown={loadingBreakdown}
                    onMotivate={handleMotivation}
                    onSetReminder={handleSetReminder}
                    onUpdatePriority={handleUpdatePriority}
                 />
             </div>
         )}

         {activeTab === 'analytics' && (
             <div>
                 <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Insights de Produtividade</h2>
                    <p className="text-slate-400 text-sm">Analise seu desempenho e hábitos.</p>
                 </div>
                 <AnalyticsDashboard tasks={tasks} />
             </div>
         )}

      </main>
    </div>
  );
}