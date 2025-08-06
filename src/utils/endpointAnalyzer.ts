import { OptaEndpoint } from '../types/index.js';
import { EndpointDiscovery, DiscoveredEndpoint } from './endpointDiscovery.js';
import { OptaCredentials } from '../types/index.js';

export interface EndpointAnalysis {
  newEndpoints: DiscoveredEndpoint[];
  existingEndpoints: OptaEndpoint[];
  categories: string[];
  patterns: string[];
  recommendations: string[];
}

export class EndpointAnalyzer {
  private discovery: EndpointDiscovery;
  private knownEndpoints: OptaEndpoint[];

  constructor(credentials: OptaCredentials, knownEndpoints: OptaEndpoint[]) {
    this.discovery = new EndpointDiscovery(credentials);
    this.knownEndpoints = knownEndpoints;
  }

  /**
   * Analyzes OPTA documentation to find new endpoints
   */
  async analyzeForNewEndpoints(): Promise<EndpointAnalysis> {
    console.log('🔍 Starting endpoint analysis...');

    // Discover all available endpoints
    const discoveredEndpoints = await this.discovery.discoverAll();
    
    // Find new endpoints by comparing with known ones
    const newEndpoints = this.findNewEndpoints(discoveredEndpoints);
    
    // Analyze patterns and categories
    const categories = this.extractCategories(discoveredEndpoints);
    const patterns = this.extractPatterns(discoveredEndpoints);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(newEndpoints, categories, patterns);

    return {
      newEndpoints,
      existingEndpoints: this.knownEndpoints,
      categories,
      patterns,
      recommendations
    };
  }

  /**
   * Finds endpoints that are not in the known endpoints list
   */
  private findNewEndpoints(discoveredEndpoints: DiscoveredEndpoint[]): DiscoveredEndpoint[] {
    const knownUrls = new Set(this.knownEndpoints.map(ep => ep.url));
    
    return discoveredEndpoints.filter(endpoint => {
      return !knownUrls.has(endpoint.url);
    });
  }

  /**
   * Extracts unique categories from discovered endpoints
   */
  private extractCategories(endpoints: DiscoveredEndpoint[]): string[] {
    const categories = new Set<string>();
    
    endpoints.forEach(endpoint => {
      categories.add(endpoint.category);
    });
    
    return Array.from(categories).sort();
  }

  /**
   * Extracts URL patterns from discovered endpoints
   */
  private extractPatterns(endpoints: DiscoveredEndpoint[]): string[] {
    const patterns = new Set<string>();
    
    endpoints.forEach(endpoint => {
      const urlParts = endpoint.url.split('/');
      
      // Look for common patterns in URLs
      for (let i = 0; i < urlParts.length - 1; i++) {
        const pattern = urlParts.slice(0, i + 1).join('/');
        if (pattern.includes('soccer') || pattern.includes('api')) {
          patterns.add(pattern);
        }
      }
    });
    
    return Array.from(patterns).sort();
  }

  /**
   * Generates recommendations based on analysis
   */
  private generateRecommendations(
    newEndpoints: DiscoveredEndpoint[], 
    categories: string[], 
    patterns: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (newEndpoints.length > 0) {
      recommendations.push(`Found ${newEndpoints.length} new endpoints that need to be added to the system`);
      
      // Group by category
      const byCategory = this.groupByCategory(newEndpoints);
      Object.entries(byCategory).forEach(([category, endpoints]) => {
        recommendations.push(`Category "${category}": ${endpoints.length} new endpoints`);
      });
    }

    if (categories.length > 0) {
      recommendations.push(`Discovered ${categories.length} categories: ${categories.join(', ')}`);
    }

    if (patterns.length > 0) {
      recommendations.push(`Identified ${patterns.length} URL patterns for potential discovery`);
    }

    if (newEndpoints.length === 0) {
      recommendations.push('No new endpoints found - all discovered endpoints are already covered');
    }

    return recommendations;
  }

  /**
   * Groups endpoints by category
   */
  private groupByCategory(endpoints: DiscoveredEndpoint[]): Record<string, DiscoveredEndpoint[]> {
    const grouped: Record<string, DiscoveredEndpoint[]> = {};
    
    endpoints.forEach(endpoint => {
      if (!grouped[endpoint.category]) {
        grouped[endpoint.category] = [];
      }
      grouped[endpoint.category].push(endpoint);
    });
    
    return grouped;
  }

  /**
   * Generates test suggestions for new endpoints
   */
  generateTestSuggestions(newEndpoints: DiscoveredEndpoint[]): string[] {
    const suggestions: string[] = [];

    newEndpoints.forEach(endpoint => {
      suggestions.push(`Create test for: ${endpoint.name} (${endpoint.url})`);
      suggestions.push(`  - Test successful scraping`);
      suggestions.push(`  - Test content extraction`);
      suggestions.push(`  - Test error handling for invalid URLs`);
    });

    return suggestions;
  }

  /**
   * Creates a summary report of the analysis
   */
  createAnalysisReport(analysis: EndpointAnalysis): string {
    const report = [
      '# OPTA Endpoint Analysis Report',
      '',
      `## Summary`,
      `- Total discovered endpoints: ${analysis.newEndpoints.length + analysis.existingEndpoints.length}`,
      `- New endpoints found: ${analysis.newEndpoints.length}`,
      `- Existing endpoints: ${analysis.existingEndpoints.length}`,
      `- Categories discovered: ${analysis.categories.length}`,
      '',
      `## New Endpoints`,
      ...analysis.newEndpoints.map(ep => `- ${ep.name} (${ep.category}) - ${ep.url}`),
      '',
      `## Categories`,
      ...analysis.categories.map(cat => `- ${cat}`),
      '',
      `## Recommendations`,
      ...analysis.recommendations.map(rec => `- ${rec}`),
      '',
      `## Test Suggestions`,
      ...this.generateTestSuggestions(analysis.newEndpoints)
    ];

    return report.join('\n');
  }
} 