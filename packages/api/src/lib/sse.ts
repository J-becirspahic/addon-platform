import { EventEmitter } from 'events';

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

export class SSEBroker {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(1000);
  }

  publish(channel: string, event: SSEEvent): void {
    this.emitter.emit(channel, event);
  }

  subscribe(channel: string, listener: (event: SSEEvent) => void): () => void {
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.removeListener(channel, listener);
    };
  }
}

export const sseBroker = new SSEBroker();

export function versionChannel(versionId: string): string {
  return `version:${versionId}`;
}
