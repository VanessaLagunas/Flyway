export type BudgetLevel = 'budget' | 'standard' | 'premium';

export interface InterestOption {
  id: string;
  label: string;
  icon: string;
}

export interface Activity {
  id: string;
  timeRange: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  costText: string;
  costAmount: number;
  category: string;
  categoryIcon: string;
  imageUrl?: string;
  imagePhotographer?: string;
  imagePhotographerUrl?: string;
  isFood?: boolean;
  whyIncluded?: string;
  history?: string;
  historicalFacts?: string[]; // Hitos cronológicos, fundaciones, anécdotas o curiosidades turísticas
  curiosity?: string; // Dato curioso o secreto que solo los guías locales conocen
  architectureOrHeritage?: string; // Detalle patrimonial o arquitectónico relevante
  savingTip?: string;
}

export interface TransferInfo {
  id: string;
  text: string;
  icon: string;
}

export type SourceEngine = 'gemini' | 'openai' | 'openrouter' | 'offline_local';

export interface TripDay {
  dayNumber: number;
  dateFormatted: string;
  dailyCost: number;
  dailyCostCLP?: number;
  imageUrl?: string;
  imagePhotographer?: string;
  imagePhotographerUrl?: string;
  title?: string;
  summary?: string;
  activities?: Activity[];
  items: Array<
    | { type: 'activity'; data: Activity }
    | { type: 'transfer'; data: TransferInfo }
  >;
}

export interface TripCostBreakdown {
  dayNumber: number;
  cost: number;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  country: string;
  region: string;
  commune: string;
  avgDailyCostCLP: number;
  tags: string[];
  description: string;
  currency: 'CLP' | string;
  totalEstimatedCostCLP: number;
  sourceEngine: SourceEngine;
  datesText: string;
  startDate: string;
  endDate: string;
  budgetLevel: BudgetLevel;
  budgetLabel: string;
  totalCost: number;
  summary: string;
  season: string;
  imageUrl?: string;
  photoUrl?: string;
  isFavorite: boolean;
  days: TripDay[];
  savingTips: string[];
  whyThisRoute: string;
  generatedByModel?: string;
  aiSource?: 'openai' | 'openrouter' | 'gemini' | 'synthesis' | 'offline_local';
  destinationCountry?: string;
  isChileanDestination?: boolean;
  imagePhotographer?: string;
  imagePhotographerUrl?: string;
  currentSeason?: string;
  weatherCondition?: string;
  temperatureRange?: string;
  weatherSummary?: string;
  clothingTip?: string;
  clothingItems?: string[];
  budgetRangeText?: string;
  budgetDescription?: string;
}

export type ActiveScreen = 'explore' | 'itinerary' | 'saved' | 'login';
