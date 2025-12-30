export type MediaType = 'image' | 'video' | 'text';
export type AppMode = 'director' | 'stocksensei';

export interface MediaFile {
  file?: File;
  previewUrl?: string;
  type: MediaType;
  base64Data?: string;
  mimeType?: string;
  textContent?: string;
}

export interface DirectorResponse {
  title?: string;
  analysis: string;
  prompt: string;
}

export interface StockSenseiResponse {
  seo: {
    titles: string[];
    bestTitle: string;
    keywords: string; // 35-50 keywords, comma separated
  };
}

export interface MarketEvent {
  name: string;
  keywords: string[];
}

export interface MarketInsight {
  trendingThemes: {
    title: string;
    description: string;
  }[];
  upcomingEvents: MarketEvent[];
  hotKeywords: string[];
  commercialAdvice: string;
}

export interface GenerationState {
  isLoading: boolean;
  result: DirectorResponse | StockSenseiResponse | null;
  error: string | null;
}

export interface SavedStyle {
  id: string;
  name: string;
  analysis: string;
  thumbnailUrl: string;
}