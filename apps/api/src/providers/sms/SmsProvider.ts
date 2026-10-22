export interface SmsMessage {
  /** E.164 phone number. */
  to: string;
  body: string;
  /** DLT template ID (required by Indian carriers for transactional SMS). */
  templateId?: string;
}

/**
 * Sends SMS. Implementations wrap a vendor (MSG91, Twilio, Gupshup, …) and are selected by
 * `SMS_PROVIDER`; application code depends only on this interface.
 */
export interface SmsProvider {
  readonly name: string;
  /** True when codes are not really delivered and may be echoed back to developers. */
  readonly isDevelopment: boolean;
  send(message: SmsMessage): Promise<void>;
}
