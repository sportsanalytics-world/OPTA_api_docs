import axios from 'axios';
import * as cheerio from 'cheerio';
import { OptaCredentials } from '../types/index.js';

export interface DiscoveredEndpoint {
  name: string;
  url: string;
  category: string;
  description?: string;
}

export class EndpointDiscovery {
  private credentials: OptaCredentials;
  private baseUrl: string;

  constructor(credentials: OptaCredentials, baseUrl: string = 'https://docs.performgroup.com') {
    this.credentials = credentials;
    this.baseUrl = baseUrl;
  }

  async discoverFromSitemap(): Promise<DiscoveredEndpoint[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/sitemap.xml`, {
        auth: {
          username: this.credentials.username,
          password: this.credentials.password
        }
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const endpoints: DiscoveredEndpoint[] = [];

      $('url').each((_, element) => {
        const loc = $(element).find('loc').text();
        const lastmod = $(element).find('lastmod').text();
        
        if (loc.includes('/docs/rh/sdapi/') && loc.includes('.htm')) {
          const url = loc.replace(this.baseUrl, '');
          const name = this.extractNameFromUrl(url);
          const category = this.extractCategoryFromUrl(url);
          
          endpoints.push({
            name,
            url,
            category,
            description: `Documentation for ${name}`
          });
        }
      });

      return endpoints;
    } catch (error) {
      console.error('Error discovering endpoints from sitemap:', error);
      return [];
    }
  }

  async discoverFromIndexPage(): Promise<DiscoveredEndpoint[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/docs/rh/sdapi/`, {
        auth: {
          username: this.credentials.username,
          password: this.credentials.password
        }
      });

      const $ = cheerio.load(response.data);
      const endpoints: DiscoveredEndpoint[] = [];

      // Look for links that point to API documentation
      $('a[href*=".htm"]').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        
        if (href && href.includes('/docs/rh/sdapi/') && text) {
          const url = href.startsWith('http') ? href.replace(this.baseUrl, '') : href;
          const name = text || this.extractNameFromUrl(url);
          const category = this.extractCategoryFromUrl(url);
          
          endpoints.push({
            name,
            url,
            category,
            description: `Documentation for ${name}`
          });
        }
      });

      return endpoints;
    } catch (error) {
      console.error('Error discovering endpoints from index page:', error);
      return [];
    }
  }

  private extractNameFromUrl(url: string): string {
    // Extract filename without extension
    const filename = url.split('/').pop()?.replace('.htm', '') || '';
    
    // Convert to readable format
    return filename
      .replace(/opta-sdapi-/g, '')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractCategoryFromUrl(url: string): string {
    // Extract category from URL
    const parts = url.split('/');
    const soccerIndex = parts.findIndex(part => part === 'soccer');
    
    if (soccerIndex !== -1 && parts[soccerIndex + 1]) {
      return parts[soccerIndex + 1];
    }
    
    // Fallback: look for any part that looks like a category
    for (const part of parts) {
      if (part && part !== 'docs' && part !== 'rh' && part !== 'sdapi' && part !== 'Topics') {
        return part;
      }
    }
    
    return 'general';
  }

  async discoverAll(): Promise<DiscoveredEndpoint[]> {
    console.log('Discovering OPTA endpoints...');
    
    const [sitemapEndpoints, indexEndpoints] = await Promise.all([
      this.discoverFromSitemap(),
      this.discoverFromIndexPage()
    ]);

    // Combine and remove duplicates
    const allEndpoints = [...sitemapEndpoints, ...indexEndpoints];
    const uniqueEndpoints = this.removeDuplicates(allEndpoints);

    console.log(`Discovered ${uniqueEndpoints.length} unique endpoints`);
    return uniqueEndpoints;
  }

  private removeDuplicates(endpoints: DiscoveredEndpoint[]): DiscoveredEndpoint[] {
    const seen = new Set<string>();
    return endpoints.filter(endpoint => {
      const key = endpoint.url;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
} 