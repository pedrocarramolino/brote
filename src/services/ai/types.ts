import type { AppData, ChatMessage } from '../../types';
import type { AssistantContext } from './context';

export interface MealEstimateItem {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AIProvider {
  readonly mode: 'demo' | 'ia';
  chat(input: { messages: Pick<ChatMessage, 'role' | 'content'>[]; context: AssistantContext; data: AppData }, signal?: AbortSignal): Promise<string>;
  analyzeMeal?(input: { text: string; imageDataUrl?: string }, signal?: AbortSignal): Promise<MealEstimateItem[]>;
}

export class AIError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}
