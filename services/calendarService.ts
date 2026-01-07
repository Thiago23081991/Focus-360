
import { Task } from "../types";

// ATENÇÃO: Para funcionar em produção, crie um projeto no Google Cloud Console,
// habilite a "Google Calendar API" e crie um "OAuth Client ID".
// Substitua abaixo. Se estiver rodando local, adicione http://localhost:5173 às origens autorizadas.
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE'; // <--- INSIRA SEU CLIENT ID AQUI
const API_KEY = process.env.API_KEY || ''; // Usa a mesma chave se possível, ou defina uma específica para APIs do Google
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initGoogleClient = (updateSigninStatus: (isSignedIn: boolean) => void) => {
  const gapi = (window as any).gapi;
  const google = (window as any).google;

  if (!gapi || !google) return;

  gapi.load('client', async () => {
    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    
    // Check if we have a token already (mock check)
    // Real check depends on session persistence logic you might want to add
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse: any) => {
        if(tokenResponse && tokenResponse.access_token) {
            updateSigninStatus(true);
        }
    },
  });
  gisInited = true;
};

export const handleAuthClick = () => {
  if (tokenClient) {
    tokenClient.requestAccessToken();
  } else {
      console.warn("Google Identity Services not initialized yet.");
      alert("Serviço de calendário inicializando. Tente novamente em instantes.");
  }
};

export const handleSignoutClick = () => {
  const google = (window as any).google;
  const gapi = (window as any).gapi;
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
  }
};

export const addTaskToCalendar = async (task: Task): Promise<string> => {
    const gapi = (window as any).gapi;
    if(!gapi || !gapi.client || !gapi.client.calendar) {
        throw new Error("API do Calendário não carregada.");
    }

    // Determine Start/End times
    let startDateTime = '';
    let endDateTime = '';
    let isAllDay = false;

    // 1. Tenta usar o Reminder ISO
    if (task.reminder && task.reminder.includes('T')) {
        startDateTime = new Date(task.reminder).toISOString();
        // Default 1 hour duration
        const end = new Date(task.reminder);
        end.setHours(end.getHours() + 1);
        endDateTime = end.toISOString();
    } 
    // 2. Tenta usar StartDate + Time
    else if (task.startDate && task.time) {
        // Tenta parsear HH:MM
        const timeParts = task.time.match(/(\d+):(\d+)/);
        if (timeParts) {
            const d = new Date(task.startDate);
            d.setHours(parseInt(timeParts[1]), parseInt(timeParts[2]));
            startDateTime = d.toISOString();
            const end = new Date(d);
            end.setHours(end.getHours() + 1);
            endDateTime = end.toISOString();
        } else {
            // Se o tempo for "30m" ou texto, assume dia todo ou padrão
             isAllDay = true;
        }
    }
    // 3. Apenas Data
    else if (task.startDate) {
        isAllDay = true;
    } else {
        // Sem data, usa 'Amanhã 09:00' como fallback
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0);
        startDateTime = d.toISOString();
        const end = new Date(d);
        end.setHours(10, 0, 0);
        endDateTime = end.toISOString();
    }

    const event: any = {
        'summary': task.title,
        'description': `Prioridade: ${task.priority}\nCategoria: ${task.category}\nGerado por Focus 360 AI`,
    };

    if (isAllDay && task.startDate) {
        event.start = { 'date': task.startDate };
        event.end = { 'date': task.endDate || task.startDate }; // Google requires end date. If same day, API handles it, typically end is exclusive so might need +1 day logic in robust app
    } else {
        event.start = { 'dateTime': startDateTime, 'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone };
        event.end = { 'dateTime': endDateTime, 'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone };
    }

    try {
        const response = await gapi.client.calendar.events.insert({
            'calendarId': 'primary',
            'resource': event,
        });
        return response.result.htmlLink;
    } catch (err: any) {
        console.error("Erro ao adicionar evento", err);
        throw new Error("Falha ao sincronizar com Google Calendar.");
    }
};
