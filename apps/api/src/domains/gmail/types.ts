export interface EmailMessage {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
}

export interface GmailStatusResponse {
  connected: boolean;
}
