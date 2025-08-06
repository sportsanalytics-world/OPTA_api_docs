import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DocumentationManager } from './services/documentationManager.js';
import { OptaScraper } from './services/optaScraper.js';
import { OptaCredentials } from './types/index.js';

const server = new Server(
  {
    name: 'opta-api-docs-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Configuration from environment variables
const credentials: OptaCredentials = {
  username: process.env.OPTA_USERNAME || '',
  password: process.env.OPTA_PASSWORD || '',
};

const baseUrl = process.env.OPTA_DOCS_BASE_URL || 'https://docs.performgroup.com';

// Initialize services
const scraper = new OptaScraper(credentials, baseUrl);
const docManager = new DocumentationManager(scraper);

// MCP Tools
const tools: Tool[] = [
  {
    name: 'search_opta_documentation',
    description: 'Search in OPTA API documentation for specific terms',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search terms to find in documentation',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_endpoint_details',
    description: 'Get complete details of a specific OPTA endpoint',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the OPTA endpoint',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'list_all_endpoints',
    description: 'List all available endpoints in OPTA documentation',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category to filter endpoints (e.g., soccer)',
        },
      },
    },
  },
  {
    name: 'refresh_documentation_cache',
    description: 'Update OPTA documentation cache',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_cache_status',
    description: 'Get current status of documentation cache',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_opta_documentation': {
        const { query } = z.object({ query: z.string() }).parse(args);
        
        console.log(`Searching: "${query}"`);
        const results = await docManager.searchDocumentation(query);
        
        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No results found for "${query}"`,
              },
            ],
          };
        }

        const resultText = results
          .slice(0, 10) // Limit to 10 results
          .map((result, index) => {
            const endpoint = result.endpoint;
            return `${index + 1}. **${endpoint.name}** (Relevance: ${result.relevance})
   - URL: ${endpoint.url}
   - Category: ${endpoint.category}
   - Description: ${endpoint.description || 'Not available'}
   - Matched terms: ${result.matchedTerms.join(', ')}
   
   ${endpoint.content ? endpoint.content.substring(0, 500) + '...' : 'No content available'}
   
   ---`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `**Search results for "${query}":**\n\n${resultText}`,
            },
          ],
        };
      }

      case 'get_endpoint_details': {
        const { url } = z.object({ url: z.string() }).parse(args);
        
        console.log(`Getting endpoint details: ${url}`);
        const endpoint = await docManager.getEndpointByUrl(url);
        
        if (!endpoint) {
          return {
            content: [
              {
                type: 'text',
                text: `Endpoint not found with URL: ${url}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `**${endpoint.name}**
              
**URL:** ${endpoint.url}
**Category:** ${endpoint.category}
**Description:** ${endpoint.description || 'Not available'}

**Complete content:**
${endpoint.content || 'No content available'}`,
            },
          ],
        };
      }

      case 'list_all_endpoints': {
        const { category } = z.object({ category: z.string().optional() }).parse(args);
        
        console.log(`Listing endpoints${category ? ` in category: ${category}` : ''}`);
        const endpoints = category 
          ? await docManager.getEndpointsByCategory(category)
          : (await docManager.getDocumentation()).endpoints;
        
        if (endpoints.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No endpoints found${category ? ` in category "${category}"` : ''}`,
              },
            ],
          };
        }

        const endpointsText = endpoints
          .map((endpoint, index) => {
            return `${index + 1}. **${endpoint.name}**
   - URL: ${endpoint.url}
   - Category: ${endpoint.category}
   - Description: ${endpoint.description || 'Not available'}`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `**Available endpoints${category ? ` in category "${category}"` : ''}:**\n\n${endpointsText}`,
            },
          ],
        };
      }

      case 'refresh_documentation_cache': {
        console.log('Updating documentation cache...');
        await docManager.refreshCache();
        
        return {
          content: [
            {
              type: 'text',
              text: 'Documentation cache updated successfully.',
            },
          ],
        };
      }

      case 'get_cache_status': {
        const status = docManager.getCacheStatus();
        
        return {
          content: [
            {
              type: 'text',
              text: `**Cache status:**
- Has cache: ${status.hasCache ? 'Yes' : 'No'}
- Cache expired: ${status.isExpired ? 'Yes' : 'No'}
- Last updated: ${status.lastUpdated ? status.lastUpdated.toISOString() : 'N/A'}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error in tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught error:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

// Initialize server
async function main() {
  console.log('Starting OPTA documentation MCP server...');
  
  // Verify credentials
  if (!credentials.username || !credentials.password) {
    console.error('Error: OPTA_USERNAME and OPTA_PASSWORD must be configured in environment variables');
    process.exit(1);
  }

  // Verify authentication
  console.log('Verifying authentication with OPTA...');
  const isAuthenticated = await scraper.authenticate();
  
  if (!isAuthenticated) {
    console.error('Error: Could not authenticate with OPTA credentials');
    process.exit(1);
  }

  console.log('Authentication successful with OPTA');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('MCP server started and ready to receive connections');
}

main().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
}); 