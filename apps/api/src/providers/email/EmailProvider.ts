export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Sends email. SMTP and Resend adapters arrive with the notifications phase. */
export interface EmailProvider {
  readonly name: string;
  readonly isDevelopment: boolean;
  send(message: EmailMessage): Promise<void>;
}
