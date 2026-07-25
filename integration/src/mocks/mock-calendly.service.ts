interface CallRecord {
  method: string;
  args: any[];
  timestamp: number;
}

export class MockCalendlyService {
  readonly calls: CallRecord[] = [];

  private record(method: string, ...args: any[]) {
    this.calls.push({ method, args, timestamp: Date.now() });
  }

  clear() {
    this.calls.length = 0;
  }

  isConfigured(): boolean {
    return false;
  }

  async getEventTypes() {
    this.record('getEventTypes');
    return [
      {
        uri: 'https://api.calendly.com/event_types/mock-video-30',
        name: 'Video Consultation (30 min)',
        active: true,
        duration: 30,
        slug: 'video-30',
      },
      {
        uri: 'https://api.calendly.com/event_types/mock-phone-30',
        name: 'Phone Consultation (30 min)',
        active: true,
        duration: 30,
        slug: 'phone-30',
      },
    ];
  }

  async findMatchingEventType(_visitMethod: string, _duration: number) {
    this.record('findMatchingEventType', _visitMethod, _duration);
    return null;
  }

  async scheduleForAppointment(_appointmentId: number) {
    this.record('scheduleForAppointment', _appointmentId);
  }

  verifyWebhookSignature(_rawBody: string, _signature: string, _timestamp: string): boolean {
    this.record('verifyWebhookSignature');
    return true;
  }

  async handleWebhookEvent(_event: any) {
    this.record('handleWebhookEvent', _event);
  }

  async cancelCalendlyEvent(_appointmentId: number, _reason?: string) {
    this.record('cancelCalendlyEvent', _appointmentId, _reason);
  }

  async getCalendlyEventDetails(_appointmentId: number, _user?: any) {
    this.record('getCalendlyEventDetails', _appointmentId);
    return null;
  }
}
