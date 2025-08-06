import { DiscoveredEndpoint } from '../utils/endpointDiscovery.js';

/**
 * Template for creating tests for new OPTA endpoints
 * This template can be used by the Cursor agent to generate tests
 */
export function generateEndpointTestTemplate(endpoint: DiscoveredEndpoint): string {
  const testName = endpoint.name.replace(/[^a-zA-Z0-9]/g, '_');
  const category = endpoint.category;
  
  return `import { OptaScraper } from '../services/optaScraper.js';
import { DocumentationManager } from '../services/documentationManager.js';
import { OptaCredentials } from '../types/index.js';

describe('${endpoint.name} Endpoint Tests', () => {
  let scraper: OptaScraper;
  let docManager: DocumentationManager;
  
  beforeAll(() => {
    const credentials: OptaCredentials = {
      username: process.env.OPTA_USERNAME || '',
      password: process.env.OPTA_PASSWORD || '',
    };
    
    scraper = new OptaScraper(credentials);
    docManager = new DocumentationManager(scraper);
  });

  describe('Endpoint Discovery', () => {
    it('should discover the ${endpoint.name} endpoint', async () => {
      const documentation = await docManager.getDocumentation();
      const foundEndpoint = documentation.endpoints.find(ep => ep.url === '${endpoint.url}');
      
      expect(foundEndpoint).toBeDefined();
      expect(foundEndpoint?.name).toBe('${endpoint.name}');
      expect(foundEndpoint?.category).toBe('${category}');
    });

    it('should categorize ${endpoint.name} correctly', async () => {
      const documentation = await docManager.getDocumentation();
      const foundEndpoint = documentation.endpoints.find(ep => ep.url === '${endpoint.url}');
      
      expect(foundEndpoint?.category).toBe('${category}');
    });
  });

  describe('Content Scraping', () => {
    it('should successfully scrape ${endpoint.name} content', async () => {
      const scrapingResult = await scraper.scrapeEndpoint('${endpoint.url}');
      
      expect(scrapingResult.success).toBe(true);
      expect(scrapingResult.content).toBeDefined();
      expect(scrapingResult.content?.length).toBeGreaterThan(0);
    });

    it('should extract meaningful content from ${endpoint.name}', async () => {
      const scrapingResult = await scraper.scrapeEndpoint('${endpoint.url}');
      
      if (scrapingResult.success && scrapingResult.content) {
        // Check for common API documentation patterns
        expect(scrapingResult.content).toMatch(/api|endpoint|parameter|response/i);
        expect(scrapingResult.content.length).toBeGreaterThan(100);
      }
    });
  });

  describe('Search Functionality', () => {
    it('should find ${endpoint.name} in search results', async () => {
      const searchTerm = '${endpoint.name.split(' ').slice(-2).join(' ')}'; // Use last two words
      const searchResults = await docManager.searchDocumentation(searchTerm);
      
      const foundInSearch = searchResults.some(result => 
        result.endpoint.url === '${endpoint.url}'
      );
      
      expect(foundInSearch).toBe(true);
    });

    it('should return ${endpoint.name} with good relevance score', async () => {
      const searchTerm = '${endpoint.name.split(' ').slice(-1)[0]}'; // Use last word
      const searchResults = await docManager.searchDocumentation(searchTerm);
      
      const endpointResult = searchResults.find(result => 
        result.endpoint.url === '${endpoint.url}'
      );
      
      if (endpointResult) {
        expect(endpointResult.relevance).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URL gracefully', async () => {
      const invalidUrl = '${endpoint.url.replace('.htm', '-invalid.htm')}';
      const scrapingResult = await scraper.scrapeEndpoint(invalidUrl);
      
      expect(scrapingResult.success).toBe(false);
      expect(scrapingResult.error).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      // This test would require mocking network failures
      // For now, we'll test that the scraper doesn't crash
      const credentials: OptaCredentials = {
        username: 'invalid',
        password: 'invalid',
      };
      
      const testScraper = new OptaScraper(credentials);
      const scrapingResult = await testScraper.scrapeEndpoint('${endpoint.url}');
      
      expect(scrapingResult.success).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate ${endpoint.name} with MCP server tools', async () => {
      const documentation = await docManager.getDocumentation();
      const endpoint = documentation.endpoints.find(ep => ep.url === '${endpoint.url}');
      
      if (endpoint) {
        // Test that the endpoint can be retrieved by URL
        const retrievedEndpoint = await docManager.getEndpointByUrl('${endpoint.url}');
        expect(retrievedEndpoint).toEqual(endpoint);
        
        // Test that the endpoint appears in category listing
        const categoryEndpoints = await docManager.getEndpointsByCategory('${category}');
        const foundInCategory = categoryEndpoints.some(ep => ep.url === '${endpoint.url}');
        expect(foundInCategory).toBe(true);
      }
    });
  });
});
`;
}

/**
 * Generate test file name for an endpoint
 */
export function generateTestFileName(endpoint: DiscoveredEndpoint): string {
  const testName = endpoint.name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  
  return `${testName}.test.ts`;
}

/**
 * Generate test suite for multiple endpoints
 */
export function generateTestSuite(endpoints: DiscoveredEndpoint[]): string {
  const imports = [
    "import { OptaScraper } from '../services/optaScraper.js';",
    "import { DocumentationManager } from '../services/documentationManager.js';",
    "import { OptaCredentials } from '../types/index.js';",
    "import { EndpointAnalyzer } from '../utils/endpointAnalyzer.js';"
  ];

  const testCases = endpoints.map(endpoint => {
    const testName = endpoint.name.replace(/[^a-zA-Z0-9]/g, '_');
    return `
  describe('${endpoint.name}', () => {
    it('should be discoverable', async () => {
      const analyzer = new EndpointAnalyzer(credentials, []);
      const analysis = await analyzer.analyzeForNewEndpoints();
      
      const foundEndpoint = analysis.newEndpoints.find(ep => ep.url === '${endpoint.url}');
      expect(foundEndpoint).toBeDefined();
    });

    it('should be scrapable', async () => {
      const scrapingResult = await scraper.scrapeEndpoint('${endpoint.url}');
      expect(scrapingResult.success).toBe(true);
    });
  });`;
  });

  return `${imports.join('\n')}

describe('New Endpoints Test Suite', () => {
  let scraper: OptaScraper;
  let docManager: DocumentationManager;
  let credentials: OptaCredentials;
  
  beforeAll(() => {
    credentials = {
      username: process.env.OPTA_USERNAME || '',
      password: process.env.OPTA_PASSWORD || '',
    };
    
    scraper = new OptaScraper(credentials);
    docManager = new DocumentationManager(scraper);
  });

${testCases.join('\n')}
});`;
} 