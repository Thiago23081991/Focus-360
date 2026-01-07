
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Task, Priority, Category, DailyPlanItem, WeeklyPlanDay, PerformanceAnalysis, Insight } from "../types";

// Lazy initialization of the AI client to prevent top-level crashes if process.env is not ready
let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

const MODEL_NAME = "gemini-3-flash-preview";

// Helper to clean JSON string if markdown code blocks are present
const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// Helper to sanitize fields and prevent [object Object] errors in React
const safeString = (val: any): string | undefined => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return undefined;
};

export const parseTaskFromInput = async (input: string): Promise<Partial<Task>> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      startDate: { type: Type.STRING, description: "Data de início YYYY-MM-DD se houver" },
      endDate: { type: Type.STRING, description: "Data de término/entrega YYYY-MM-DD se houver" },
      time: { type: Type.STRING, description: "HH:MM ou duração se houver" },
      reminder: { type: Type.STRING, description: "YYYY-MM-DDTHH:MM para lembrete pontual OU HH:MM para lembrete diário recorrente" },
      priority: { type: Type.STRING, enum: Object.values(Priority) },
      category: { type: Type.STRING, enum: Object.values(Category) },
    },
    required: ["title", "priority", "category"],
  };

  const response = await getAi().models.generateContent({
    model: MODEL_NAME,
    contents: `Transforme a frase do usuário em uma tarefa estruturada. Frase: "${input}"
    Se a prioridade não estiver clara, assuma "${Priority.UNSET}". Se a categoria não estiver clara, assuma "${Category.OTHER}".
    
    Regras para Datas e Lembretes:
    1. Se o usuário definir um período (ex: "durante 1 mês", "semana que vem"), preencha startDate e endDate.
    2. Se o usuário pedir lembrete "todos os dias" ou "diariamente" dentro desse período, defina 'reminder' APENAS com a hora (HH:MM).
    3. Se for um lembrete para uma data específica única, use o formato ISO completo (YYYY-MM-DDTHH:MM).
    4. Diferencie 'horário da tarefa' (time) de 'lembrete' (reminder).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const parsed = JSON.parse(cleanJson(response.text || "{}"));

  // Sanitize return to ensure no objects are passed to UI strings
  return {
    title: safeString(parsed.title),
    startDate: safeString(parsed.startDate),
    endDate: safeString(parsed.endDate),
    time: safeString(parsed.time),
    reminder: safeString(parsed.reminder),
    priority: (safeString(parsed.priority) as Priority) || Priority.UNSET,
    category: (safeString(parsed.category) as Category) || Category.OTHER,
  };
};

export const prioritizeTasksAI = async (tasks: Task[]): Promise<{ id: string; priority: Priority }[]> => {
  const taskListString = tasks.map(t => {
    const dates = t.startDate && t.endDate ? `${t.startDate} a ${t.endDate}` : (t.endDate || t.startDate || 'Sem data');
    return `- ID: ${t.id}, Título: ${t.title}, Data: ${dates}`;
  }).join('\n');

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        priority: { type: Type.STRING, enum: [Priority.CRITICAL, Priority.IMPORTANT, Priority.CAN_WAIT] },
      },
      required: ["id", "priority"],
    },
  };

  const response = await getAi().models.generateContent({
    model: MODEL_NAME,
    contents: `Analise a lista de tarefas abaixo e classifique cada uma como: "${Priority.CRITICAL}", "${Priority.IMPORTANT}", ou "${Priority.CAN_WAIT}".
    Considere prazos implícitos, impacto e esforço.
    Tarefas:
    ${taskListString}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const parsed = JSON.parse(cleanJson(response.text || "[]"));
  return parsed.map((item: any) => ({
    id: safeString(item.id) || '',
    priority: (safeString(item.priority) as Priority) || Priority.UNSET
  }));
};

export const generateDailyPlan = async (tasks: Task[]): Promise<DailyPlanItem[]> => {
  const openTasks = tasks.filter(t => !t.completed).map(t => {
    const dateInfo = t.endDate ? `[Prazo: ${t.endDate}]` : '';
    return `${t.title} ${dateInfo} (${t.time || '30m'})`
  }).join('\n');

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        timeSlot: { type: Type.STRING, description: "ex: 08:00 - 09:00" },
        activity: { type: Type.STRING },
        isBreak: { type: Type.BOOLEAN },
      },
      required: ["timeSlot", "activity", "isBreak"],
    },
  };

  const response = await getAi().models.generateContent({
    model: MODEL_NAME,
    contents: `Crie um planejamento diário eficiente começando às 08:00 usando as tarefas abaixo.
    Regras:
    - Comece pelas tarefas mais importantes (infira pelo título e prazo)
    - Agrupe tarefas semelhantes
    - Sugira pausas curtas (15m) a cada 2 horas
    - Evite sobrecarregar o usuário
    - Responda em Português do Brasil.
    
    Tarefas disponíveis:
    ${openTasks}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const parsed = JSON.parse(cleanJson(response.text || "[]"));
  return parsed.map((item: any) => ({
      timeSlot: safeString(item.timeSlot) || '00:00',
      activity: safeString(item.activity) || 'Atividade',
      isBreak: !!item.isBreak
  }));
};

export const generateWeeklyPlan = async (tasks: Task[]): Promise<WeeklyPlanDay[]> => {
  const openTasks = tasks.filter(t => !t.completed).map(t =>
    `- ${t.title} (Prioridade: ${t.priority}, Categoria: ${t.category}, Prazo: ${t.endDate || 'N/A'})`
  ).join('\n');

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        day: { type: Type.STRING, description: "Dia da semana (Segunda, Terça...)" },
        focus: { type: Type.STRING, description: "Foco principal do dia (ex: Foco Administrativo, Estudos...)" },
        tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["day", "focus", "tasks"],
    },
  };

  const response = await getAi().models.generateContent({
    model: MODEL_NAME,
    contents: `Organize as tarefas da semana de forma equilibrada.
    
    Regras:
    - Distribua tarefas pesadas ao longo da semana para não sobrecarregar.
    - Agrupe tarefas por contexto quando possível.
    - Se houver prazos, respeite-os.
    - Crie um plano de 5 a 7 dias dependendo da quantidade de tarefas.
    - Responda em Português.

    Tarefas:
    ${openTasks}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const parsed = JSON.parse(cleanJson(response.text || "[]"));
  return parsed.map((item: any) => ({
      day: safeString(item.day) || 'Dia',
      focus: safeString(item.focus) || 'Geral',
      tasks: Array.isArray(item.tasks) ? item.tasks.map((t: any) => safeString(t) || '').filter(Boolean) : []
  }));
};

export const breakDownTask = async (taskTitle: string): Promise<string[]> => {
  const schema: Schema = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
  };

  const response = await getAi().models.generateContent({
    model: MODEL_NAME,
    contents: `Quebre a tarefa abaixo em pequenas ações práticas e fáceis de executar em até 30 minutos cada. Responda em Português.
    Tarefa: "${taskTitle}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const parsed = JSON.parse(cleanJson(response.text || "[]"));
  return Array.isArray(parsed) ? parsed.map((t: any) => safeString(t) || '').filter(Boolean) : [];
};

export const analyzePerformance = async (completed: Task[], notCompleted: Task[]): Promise<PerformanceAnalysis> => {
  const completedTitles = completed.map(t => t.title).join(', ');
  const notCompletedTitles = notCompleted.map(t => t.title).join(', ');

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      positivePoint: { type: Type.STRING },
      difficulty: { type: Type.STRING },
      suggestion: { type: Type.STRING },
    },
    required: ["summary", "positivePoint", "difficulty", "suggestion"],
  };

  const response = await getAi().models.generateContent({
    model: MODEL_NAME,
    contents: `Analise o desempenho do usuário com base nas informações abaixo. Responda em Português.
    
    Tarefas concluídas: ${completedTitles}
    Tarefas não concluídas: ${notCompletedTitles}
    
    Entregue:
    - resumo do dia
    - um ponto positivo
    - principal dificuldade enfrentada (provável)
    - uma sugestão prática para amanhã`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const parsed = JSON.parse(cleanJson(response.text || "{}"));
  return {
      summary: safeString(parsed.summary) || 'Sem dados suficientes.',
      positivePoint: safeString(parsed.positivePoint) || 'Continue registrando suas tarefas.',
      difficulty: safeString(parsed.difficulty) || 'Nenhuma dificuldade detectada.',
      suggestion: safeString(parsed.suggestion) || 'Tente concluir uma tarefa pequena primeiro.'
  };
};

export const getMotivationalMessage = async (task: Task): Promise<string> => {
    const response = await getAi().models.generateContent({
        model: MODEL_NAME,
        contents: `Crie uma mensagem curta, motivadora e prática para incentivar o usuário a iniciar a tarefa: "${task.title}".
        Contexto: Prioridade é ${task.priority}.
        Mantenha em menos de 20 palavras. Evite clichês. Responda em Português.`,
    });
    return response.text || "Vamos lá, você consegue!";
}
