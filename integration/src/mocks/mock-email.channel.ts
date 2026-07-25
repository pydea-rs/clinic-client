interface CapturedEmail {
  userId: string;
  subject: string;
  body: string;
  data?: Record<string, any>;
  timestamp: number;
}

export class MockEmailChannel {
  private emails: CapturedEmail[] = [];

  async send(
    userId: string,
    subject: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    this.emails.push({ userId, subject, body, data, timestamp: Date.now() });
  }

  getEmails(): CapturedEmail[] {
    return [...this.emails];
  }

  getEmailsForUser(userId: string): CapturedEmail[] {
    return this.emails.filter((e) => e.userId === userId);
  }

  clear(): void {
    this.emails.length = 0;
  }

  get count(): number {
    return this.emails.length;
  }
}
