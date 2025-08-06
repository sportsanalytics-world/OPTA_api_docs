export interface OptaCredentials {
  username: string;
  password: string;
}

export interface OptaEndpoint {
  name: string;
  url: string;
  description?: string;
  category: string;
  content?: string;
}

export interface OptaDocumentation {
  endpoints: OptaEndpoint[];
  lastUpdated: Date;
}

export interface SearchResult {
  endpoint: OptaEndpoint;
  relevance: number;
  matchedTerms: string[];
}

export interface ScrapingResult {
  success: boolean;
  content?: string;
  error?: string;
  url: string;
} 