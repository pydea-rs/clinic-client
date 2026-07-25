interface CallRecord {
  method: string;
  args: any[];
  timestamp: number;
}

export class MockOpenAiService {
  readonly calls: CallRecord[] = [];
  private chatHistories = new Map<string, any[]>();

  private record(method: string, ...args: any[]) {
    this.calls.push({ method, args, timestamp: Date.now() });
  }

  clear() {
    this.calls.length = 0;
    this.chatHistories.clear();
  }

  async getChatHistory(chatId: string) {
    if (!this.chatHistories.has(chatId)) {
      this.chatHistories.set(chatId, [
        { role: 'system', content: 'You are a medical assistant.' },
      ]);
    }
    return this.chatHistories.get(chatId)!;
  }

  async updateChat(chatId: string, newMessages: any[]) {
    const history = await this.getChatHistory(chatId);
    history.push(...newMessages);
  }

  async runCompletion(chatId: string, prompt: string) {
    this.record('runCompletion', chatId, prompt);
    await this.updateChat(chatId, [
      { role: 'user', content: prompt },
      { role: 'assistant', content: 'Based on your symptoms, I recommend consulting with a doctor. This could be related to several conditions that need professional evaluation.' },
    ]);
    return {
      id: `chatcmpl-mock-${Date.now()}`,
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Based on your symptoms, I recommend consulting with a doctor. This could be related to several conditions that need professional evaluation.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };
  }

  async openNewChat(userId: string, message: string) {
    this.record('openNewChat', userId, message);
    return 'Based on your symptoms, I recommend consulting with a doctor. This could be related to several conditions that need professional evaluation.';
  }
}
