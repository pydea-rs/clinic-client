interface CapturedPush {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: number;
}

export class MockWebPushChannel {
  private notifications: CapturedPush[] = [];

  async send(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    this.notifications.push({ userId, title, body, data, timestamp: Date.now() });
  }

  getNotifications(): CapturedPush[] {
    return [...this.notifications];
  }

  getNotificationsForUser(userId: string): CapturedPush[] {
    return this.notifications.filter((n) => n.userId === userId);
  }

  clear(): void {
    this.notifications.length = 0;
  }

  get count(): number {
    return this.notifications.length;
  }
}
