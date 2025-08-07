import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { OptaCredentials } from './types/index.js';

const server = new Server(
  {
    name: 'opta-api-docs-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {
        listChanged: false,
        tools: [
          {
            name: 'get_endpoint_documentation',
            description: 'Get the HTML documentation content for a specific OPTA endpoint and answer questions about it',
            inputSchema: {
              type: 'object',
              properties: {
                endpoint_code: {
                  type: 'string',
                  description: 'The endpoint code (e.g., MA13, MA1, PE2, etc.)',
                },
                question: {
                  type: 'string',
                  description: 'Question about the endpoint documentation (e.g., "What is the overview?", "What are the parameters?", etc.)',
                },
              },
              required: ['endpoint_code', 'question'],
            },
          },
        ],
      },
    },
  }
);

// Configuration from environment variables
const credentials: OptaCredentials = {
  username: process.env.OPTA_USERNAME || '',
  password: process.env.OPTA_PASSWORD || '',
};

const baseUrl = process.env.OPTA_DOCS_BASE_URL || 'https://docs.performgroup.com';

// MCP Tools
const tools: Tool[] = [
  {
    name: 'get_endpoint_documentation',
    description: 'Get the HTML documentation content for a specific OPTA endpoint and answer questions about it',
    inputSchema: {
      type: 'object',
      properties: {
        endpoint_code: {
          type: 'string',
          description: 'The endpoint code (e.g., MA13, MA1, PE2, etc.)',
        },
        question: {
          type: 'string',
          description: 'Question about the endpoint documentation (e.g., "What is the overview?", "What are the parameters?", etc.)',
        },
      },
      required: ['endpoint_code', 'question'],
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
      case 'get_endpoint_documentation': {
        const { endpoint_code, question } = z.object({ 
          endpoint_code: z.string(),
          question: z.string()
        }).parse(args);
        
        console.log(`Getting documentation for endpoint: ${endpoint_code}`);
        console.log(`Question: ${question}`);
        
        // Buscar el endpoint en el archivo JSON
        const fs = await import('fs');
        const path = await import('path');
        // Usar ruta relativa desde el directorio de trabajo actual
        const endpointsFile = path.join(process.cwd(), 'processed-endpoints.json');
        
        if (!fs.existsSync(endpointsFile)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: processed-endpoints.json not found. Run npm run process:endpoints first.',
              },
            ],
          };
        }

        const endpointsData = JSON.parse(fs.readFileSync(endpointsFile, 'utf-8'));
        const endpoint = endpointsData.endpoints.find((ep: any) => ep.code === endpoint_code);
        
        if (!endpoint) {
          return {
            content: [
              {
                type: 'text',
                text: `Endpoint ${endpoint_code} not found. Available endpoints: ${endpointsData.endpoints.map((ep: any) => ep.code).filter(Boolean).join(', ')}`,
              },
            ],
          };
        }

        // Get the HTML content of the endpoint
        const fullUrl = `${baseUrl}${endpoint.url}`;
        console.log(`Fetching: ${fullUrl}`);
        
        const response = await axios.get(fullUrl, {
          auth: {
            username: credentials.username,
            password: credentials.password,
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
          timeout: 30000,
        });

        if (response.status !== 200) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Could not fetch endpoint documentation. Status: ${response.status}`,
              },
            ],
          };
        }

        // Parsear el HTML
        const $ = cheerio.load(response.data);
        
        // Extraer el contenido principal
        const title = $('title').text().trim();
        const mainContent = $('body').text().trim();
        
        // Clean content (remove extra spaces, multiple line breaks)
        const cleanContent = mainContent
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n')
          .trim();

        // Responder basado en la pregunta
        let answer = '';
        
                  if (question.toLowerCase().includes('overview') || question.toLowerCase().includes('what is')) {
          // Find the first significant paragraph as overview
          const paragraphs = $('p');
          for (let i = 0; i < paragraphs.length; i++) {
            const text = $(paragraphs[i]).text().trim();
            if (text.length > 100 && !text.includes('©') && !text.includes('Copyright')) {
              answer = `**Overview de ${endpoint.name} (${endpoint_code}):**\n\n${text}`;
              break;
            }
          }
          if (!answer) {
            answer = `**Overview de ${endpoint.name} (${endpoint_code}):**\n\n${cleanContent.substring(0, 500)}...`;
          }
                  } else if (question.toLowerCase().includes('parameters')) {
          // Search for parameter sections
                      const paramSections = $('*:contains("Parameters")');
          if (paramSections.length > 0) {
                          answer = `**Parameters of ${endpoint.name} (${endpoint_code}):**\n\n${paramSections.first().text().trim()}`;
          } else {
                          answer = `No specific parameter sections found for ${endpoint.name} (${endpoint_code}).`;
          }
        } else if (question.toLowerCase().includes('ejemplos') || question.toLowerCase().includes('examples')) {
          // Buscar secciones de ejemplos
          const exampleSections = $('*:contains("Examples"), *:contains("Ejemplos"), *:contains("Example")');
          if (exampleSections.length > 0) {
            answer = `**Ejemplos de ${endpoint.name} (${endpoint_code}):**\n\n${exampleSections.first().text().trim()}`;
          } else {
                          answer = `No specific examples sections found for ${endpoint.name} (${endpoint_code}).`;
          }
        } else {
          // Respuesta general con el contenido completo
                      answer = `**Documentation of ${endpoint.name} (${endpoint_code}):**\n\n${cleanContent.substring(0, 2000)}${cleanContent.length > 2000 ? '...' : ''}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: answer,
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

  console.log('MCP server started and ready to receive connections');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('MCP server connected and ready');
}

main().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
}); 