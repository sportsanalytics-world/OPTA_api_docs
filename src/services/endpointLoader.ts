import fs from 'fs';
import path from 'path';
import { OptaEndpoint } from '../types/index.js';

interface ProcessedEndpoints {
  timestamp: string;
  totalEndpoints: number;
  categories: string[];
  endpoints: {
    name: string;
    url: string;
    category: string;
    description?: string;
    code?: string;
  }[];
}

export class EndpointLoader {
  private endpoints: OptaEndpoint[] = [];
  private lastLoaded: Date | null = null;

  async loadEndpoints(): Promise<OptaEndpoint[]> {
    try {
      const filePath = path.join(process.cwd(), 'processed-endpoints.json');
      
      if (!fs.existsSync(filePath)) {
        console.warn('processed-endpoints.json not found. Run npm run process:endpoints first.');
        return [];
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data: ProcessedEndpoints = JSON.parse(fileContent);
      
      this.endpoints = data.endpoints.map(endpoint => ({
        name: endpoint.name,
        url: endpoint.url,
        category: endpoint.category,
        description: endpoint.description,
        code: endpoint.code,
        content: undefined // Will be loaded on demand
      }));
      
      this.lastLoaded = new Date();
      console.log(`Loaded ${this.endpoints.length} endpoints from processed-endpoints.json`);
      
      return this.endpoints;
    } catch (error) {
      console.error('Error loading endpoints:', error);
      return [];
    }
  }

  getEndpoints(): OptaEndpoint[] {
    return this.endpoints;
  }

  getEndpointsByCategory(category: string): OptaEndpoint[] {
    return this.endpoints.filter(endpoint => 
      endpoint.category.toLowerCase() === category.toLowerCase()
    );
  }

  getEndpointByUrl(url: string): OptaEndpoint | null {
    return this.endpoints.find(endpoint => endpoint.url === url) || null;
  }

  searchEndpoints(query: string): OptaEndpoint[] {
    const queryLower = query.toLowerCase();
    return this.endpoints.filter(endpoint => {
      return (
        endpoint.name.toLowerCase().includes(queryLower) ||
        (endpoint.description && endpoint.description.toLowerCase().includes(queryLower)) ||
        endpoint.category.toLowerCase().includes(queryLower) ||
        (endpoint.code && endpoint.code.toLowerCase().includes(queryLower))
      );
    });
  }

  getLastLoaded(): Date | null {
    return this.lastLoaded;
  }
} 