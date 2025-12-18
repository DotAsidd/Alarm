
export interface Reminder {
  id: string;
  time: string;
  message: string;
  type: 'system' | 'ai';
}

export enum ReminderFrequency {
  TEN_MINUTES = 10,
  FIFTEEN_MINUTES = 15,
  THIRTY_MINUTES = 30,
}

export interface Settings {
  enableTTS: boolean;
  enableAI: boolean;
  frequency: number;
}
