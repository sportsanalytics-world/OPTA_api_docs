import { OptaDocumentation, OptaEndpoint, SearchResult } from '../types/index.js';
import { OptaScraper } from './optaScraper.js';

export class DocumentationManager {
  private scraper: OptaScraper;
  private cache: OptaDocumentation | null = null;
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION_HOURS = 24; // Cache for 24 hours

  constructor(scraper: OptaScraper) {
    this.scraper = scraper;
  }

  private isCacheValid(): boolean {
    if (!this.cache || !this.cacheExpiry) {
      return false;
    }
    return new Date() < this.cacheExpiry;
  }

  private setCacheExpiry(): void {
    this.cacheExpiry = new Date();
    this.cacheExpiry.setHours(this.cacheExpiry.getHours() + this.CACHE_DURATION_HOURS);
  }

  async getDocumentation(): Promise<OptaDocumentation> {
    if (this.isCacheValid() && this.cache) {
      return this.cache;
    }

    console.log('Updating documentation cache...');
    const endpoints = await this.scraper.discoverEndpoints();
    
    this.cache = {
      endpoints,
      lastUpdated: new Date()
    };
    
    this.setCacheExpiry();
    return this.cache;
  }

  async searchDocumentation(query: string): Promise<SearchResult[]> {
    const documentation = await this.getDocumentation();
    const results: SearchResult[] = [];
    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);

    for (const endpoint of documentation.endpoints) {
      let relevance = 0;
      const matchedTerms: string[] = [];

      // Search in endpoint name
      const nameLower = endpoint.name.toLowerCase();
      for (const term of queryTerms) {
        if (nameLower.includes(term)) {
          relevance += 10;
          matchedTerms.push(term);
        }
      }

      // Search in description
      if (endpoint.description) {
        const descLower = endpoint.description.toLowerCase();
        for (const term of queryTerms) {
          if (descLower.includes(term)) {
            relevance += 5;
            if (!matchedTerms.includes(term)) {
              matchedTerms.push(term);
            }
          }
        }
      }

      // Search in content
      if (endpoint.content) {
        const contentLower = endpoint.content.toLowerCase();
        for (const term of queryTerms) {
          if (contentLower.includes(term)) {
            relevance += 1;
            if (!matchedTerms.includes(term)) {
              matchedTerms.push(term);
            }
          }
        }
      }

      // Search in category
      const categoryLower = endpoint.category.toLowerCase();
      for (const term of queryTerms) {
        if (categoryLower.includes(term)) {
          relevance += 3;
          if (!matchedTerms.includes(term)) {
            matchedTerms.push(term);
          }
        }
      }

      if (relevance > 0) {
        results.push({
          endpoint,
          relevance,
          matchedTerms
        });
      }
    }

    // Sort by relevance descending
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  async getEndpointByUrl(url: string): Promise<OptaEndpoint | null> {
    const documentation = await this.getDocumentation();
    return documentation.endpoints.find(endpoint => endpoint.url === url) || null;
  }

  async getEndpointsByCategory(category: string): Promise<OptaEndpoint[]> {
    const documentation = await this.getDocumentation();
    return documentation.endpoints.filter(endpoint => 
      endpoint.category.toLowerCase() === category.toLowerCase()
    );
  }

  async refreshCache(): Promise<void> {
    this.cache = null;
    this.cacheExpiry = null;
    await this.getDocumentation();
  }

  getCacheStatus(): { hasCache: boolean; isExpired: boolean; lastUpdated?: Date } {
    return {
      hasCache: this.cache !== null,
      isExpired: !this.isCacheValid(),
      lastUpdated: this.cache?.lastUpdated
    };
  }
} 