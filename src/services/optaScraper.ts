import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { OptaCredentials, OptaEndpoint, ScrapingResult } from '../types/index.js';
import { EndpointDiscovery, DiscoveredEndpoint } from '../utils/endpointDiscovery.js';

export class OptaScraper {
  private client: AxiosInstance;
  private credentials: OptaCredentials;
  private baseUrl: string;

  constructor(credentials: OptaCredentials, baseUrl: string = 'https://docs.performgroup.com') {
    this.credentials = credentials;
    this.baseUrl = baseUrl;
    
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
  }

  async authenticate(): Promise<boolean> {
    try {
      // Try to access a protected page to verify authentication
      const response = await this.client.get('/Topics/soccer/opta-sdapi-soccer-api-possession-events.htm', {
        auth: {
          username: this.credentials.username,
          password: this.credentials.password
        }
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  async scrapeEndpoint(url: string): Promise<ScrapingResult> {
    try {
      const response = await this.client.get(url, {
        auth: {
          username: this.credentials.username,
          password: this.credentials.password
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract main content from documentation
      const content = $('body').text().trim();
      
      return {
        success: true,
        content,
        url
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        url
      };
    }
  }

  async discoverEndpoints(): Promise<OptaEndpoint[]> {
    const endpoints: OptaEndpoint[] = [];
    
    // Try automatic discovery first
    const discovery = new EndpointDiscovery(this.credentials, this.baseUrl);
    let discoveredEndpoints: DiscoveredEndpoint[] = [];
    
    try {
      discoveredEndpoints = await discovery.discoverAll();
    } catch (error) {
      console.warn('Error in automatic discovery, using known endpoints:', error);
    }

    // If no endpoints were discovered automatically, use known ones
    if (discoveredEndpoints.length === 0) {
      discoveredEndpoints = [
        {
          name: 'Soccer API Possession Events',
          url: '/Topics/soccer/opta-sdapi-soccer-api-possession-events.htm',
          category: 'soccer',
          description: 'API for football possession events'
        },
        {
          name: 'Soccer API Match Events',
          url: '/Topics/soccer/opta-sdapi-soccer-api-match-events.htm',
          category: 'soccer',
          description: 'API for football match events'
        },
        {
          name: 'Soccer API Player Statistics',
          url: '/Topics/soccer/opta-sdapi-soccer-api-player-statistics.htm',
          category: 'soccer',
          description: 'API for player statistics'
        },
        {
          name: 'Soccer API Team Statistics',
          url: '/Topics/soccer/opta-sdapi-soccer-api-team-statistics.htm',
          category: 'soccer',
          description: 'API for team statistics'
        }
      ];
    }

    console.log(`Processing ${discoveredEndpoints.length} endpoints...`);

    // Process endpoints in batches to avoid overload
    const batchSize = 5;
    for (let i = 0; i < discoveredEndpoints.length; i += batchSize) {
      const batch = discoveredEndpoints.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (endpoint) => {
        const scrapingResult = await this.scrapeEndpoint(endpoint.url);
        
        if (scrapingResult.success && scrapingResult.content) {
          return {
            ...endpoint,
            content: scrapingResult.content
          };
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      endpoints.push(...batchResults.filter(Boolean) as OptaEndpoint[]);
      
      // Small pause between batches to be respectful to the server
      if (i + batchSize < discoveredEndpoints.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return endpoints;
  }

  async searchInContent(query: string, endpoints: OptaEndpoint[]): Promise<OptaEndpoint[]> {
    const queryLower = query.toLowerCase();
    const results: OptaEndpoint[] = [];

    for (const endpoint of endpoints) {
      if (endpoint.content) {
        const contentLower = endpoint.content.toLowerCase();
        if (contentLower.includes(queryLower)) {
          results.push(endpoint);
        }
      }
    }

    return results;
  }
} 