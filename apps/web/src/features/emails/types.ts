export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

export interface GmailStatus {
  connected: boolean;
}

export type GmailInboxResponse = EmailMessage[];

export interface GoogleAuthUrlResponse {
  url: string;
}

export type EmailError = string | null;
