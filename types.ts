export enum ProcessingStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ExpenseItem {
  item: string;
  amount: number;
  category: string;
}

export interface ExpenseResponse {
  transcription: string;
  translation: string;
  expenses: ExpenseItem[];
  totalAmount: number;
  currency: string;
}

export interface AudioState {
  blob: Blob | null;
  url: string | null;
}