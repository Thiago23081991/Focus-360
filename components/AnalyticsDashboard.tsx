
import React, { useEffect, useState } from 'react';
import { PerformanceAnalysis, Task, Priority, Category } from '../types';
import { analyzePerformance } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Loader2, TrendingUp, ThumbsUp, AlertCircle, Lightbulb } from 'lucide-react';

interface AnalyticsDashboardProps {
  tasks: Task[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ tasks }) => {
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const completedTasks = tasks.filter(t => t.completed);
  const openTasks = tasks.filter(t => !t.completed);

  // Data for Charts
  const completionData = [
    { name: 'Concluídas', value: completedTasks.length },
    { name: 'Pendentes', value: openTasks.length },
  ];
  const COLORS = ['#10B981', '#334155']; // Emerald and Slate-700

  // Priority Distribution
  const priorityData = Object.values(Priority).map(p => ({
    name: p,
    count: tasks.filter(t => t.priority === p).length
  })).filter(d => d.count > 0);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (tasks.length < 3) return; // Need some data
      setLoading(true);
      try {
        const result = await analyzePerformance(completedTasks, openTasks);
        setAnalysis(result);
      } catch (e) {
        console.error("Analysis failed", e);
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch if we haven't or if tasks changed significantly (simple check)
    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length, completedTasks.length]);

  if (tasks.length === 0) {
    return <div className="p-8 text-center text-slate-500">Adicione tarefas para ver as análises.</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Completion Chart */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Status de Conclusão</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2 text-sm text-slate-400">
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div>Concluídas</div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-700 rounded-full"></div>Pendentes</div>
          </div>
        </div>

        {/* Priority Chart */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
           <h3 className="text-lg font-semibold text-slate-200 mb-4">Carga por Prioridade</h3>
           <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} stroke="#94a3b8" />
                <YAxis hide />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9'}} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 p-6 rounded-2xl border border-indigo-500/20">
        <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-200">Análise de Desempenho IA</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-indigo-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Analisando padrões...
          </div>
        ) : analysis ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-400 mb-2 font-medium">
                    <ThumbsUp className="w-4 h-4" /> Pontos Positivos
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.positivePoint}</p>
             </div>
             <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 text-amber-400 mb-2 font-medium">
                    <AlertCircle className="w-4 h-4" /> Desafios
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.difficulty}</p>
             </div>
             <div className="p-4 bg-indigo-600/20 text-indigo-200 rounded-xl border border-indigo-500/30 shadow-sm">
                <div className="flex items-center gap-2 mb-2 font-medium text-indigo-300">
                    <Lightbulb className="w-4 h-4" /> Sugestão Inteligente
                </div>
                <p className="text-sm leading-relaxed opacity-95">{analysis.suggestion}</p>
             </div>
             <div className="col-span-1 md:col-span-3 mt-2 p-4 bg-slate-800/30 rounded-lg text-sm text-slate-400 italic border border-slate-800">
                "{analysis.summary}"
             </div>
          </div>
        ) : (
           <p className="text-slate-500 text-sm">Conclua algumas tarefas para liberar insights da IA.</p>
        )}
      </div>
    </div>
  );
};
