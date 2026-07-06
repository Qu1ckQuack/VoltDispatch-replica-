export interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface NotificationAdapter {
  send(
    recipient: string,
    subject: string,
    body: string,
    payload?: Record<string, unknown>,
  ): Promise<SendResult>;
  readonly channel: 'EMAIL' | 'LINE';
}
