
export enum Priority {
  CRITICAL = 'Crítica',
  IMPORTANT = 'Importante',
  CAN_WAIT = 'Pode Esperar',
  UNSET = 'Não definida'
}

export enum Category {
  WORK = 'Trabalho',
  STUDY = 'Estudos',
  PERSONAL = 'Pessoal',
  FINANCE = 'Financeiro',
  HEALTH = 'Saúde',
  OTHER = 'Outro'
}

export interface Task {
  id: string;
  title: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  time?: string;      // HH:MM or duration
  reminder?: string;  // HH:MM (Diário) ou YYYY-MM-DDTHH:MM (Específico)
  priority: Priority;
  category: Category;
  completed: boolean;
  subtasks?: Task[];
}

export interface DailyPlanItem {
  timeSlot: string;
  taskId?: string; // Link to original task if applicable
  activity: string;
  isBreak: boolean;
}

export interface WeeklyPlanDay {
  day: string;
  focus: string;
  tasks: string[];
}

export interface PerformanceAnalysis {
  summary: string;
  positivePoint: string;
  difficulty: string;
  suggestion: string;
}

export interface Insight {
  pattern: string;
  recommendation: string;
}
