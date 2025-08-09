import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { OptaCredentials } from './types/index.js';
import { HtmlCacheManager } from './services/htmlCacheManager.js';
import { randomUUID } from 'node:crypto';

// In STDIO mode, redirect console.log to stderr to avoid writing non-MCP data to stdout
const isStdioMode = !process.env.PORT && !process.env.MCP_PORT;
if (isStdioMode) {
  // eslint-disable-next-line no-console
  console.log = (...args: unknown[]) => console.error(...args);
}

// Initialize HTML cache manager
const htmlCacheManager = new HtmlCacheManager();

console.log('[MCP SERVER] Starting MCP server with HTML cache support');
console.log('[MCP SERVER] Cache manager initialized:', htmlCacheManager.getCacheStatus());

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
        
        console.log(`[CACHE DEBUG] === CACHE DEBUG START ===`);
        console.log(`[CACHE DEBUG] Endpoint code: ${endpoint_code}`);
        console.log(`[CACHE DEBUG] HtmlCacheManager instance:`, htmlCacheManager ? 'EXISTS' : 'NULL');
        
        // Buscar el endpoint en el archivo JSON
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        // Obtener la ruta del directorio actual del módulo
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        // Usar ruta absoluta basada en __dirname para asegurar que funcione desde cualquier directorio
        // El archivo se copia a dist/ durante el build, así que está en la misma ubicación que el servidor
        const endpointsFile = path.join(__dirname, 'processed-endpoints.json');
        
        console.log(`[DEBUG] Looking for endpoints file at: ${endpointsFile}`);
        console.log(`[DEBUG] __dirname: ${__dirname}`);
        console.log(`[DEBUG] File exists: ${fs.existsSync(endpointsFile)}`);
        
        if (!fs.existsSync(endpointsFile)) {
          console.log(`[DEBUG] File not found! Current working directory: ${process.cwd()}`);
          console.log(`[DEBUG] Files in __dirname:`, fs.readdirSync(__dirname));
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

                // Try to get HTML content from cache first
                const fullUrl = `${baseUrl}${endpoint.url}`;
                let htmlContent = null;
                let $;
                
                // Try cache first
                try {
                    htmlContent = await htmlCacheManager.getCachedHtml(endpoint_code);
                } catch (error) {
                    console.log(`[CACHE DEBUG] Error checking cache:`, error);
                }
                
                if (htmlContent) {
                    // Use cached content
                    $ = cheerio.load(htmlContent);
                } else {
                    // Cache miss, fetch from OPTA
                    console.log(`Cache miss for endpoint: ${endpoint_code}, fetching from OPTA...`);
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

                    // Cache the HTML content for future use
                    console.log(`[CACHE DEBUG] Attempting to cache HTML for endpoint: ${endpoint_code}`);
                    try {
                        await htmlCacheManager.cacheHtml(endpoint_code, fullUrl, response.data);
                    } catch (error) {
                        console.log(`[CACHE DEBUG] Error caching HTML:`, error);
                    }
                    
                    // Parse the HTML
                    $ = cheerio.load(response.data);
                }
        
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

  const port = process.env.PORT || process.env.MCP_PORT;
  if (port) {
    // Streamable HTTP transport (spec-compliant). Exposes full MCP over HTTP at /mcp
    const httpStateful = (process.env.MCP_HTTP_STATEFUL ?? 'true').toLowerCase() === 'true';
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: httpStateful ? () => randomUUID() : undefined,
      enableJsonResponse: true,
    });
    console.log(`[HTTP MCP] Using ${httpStateful ? 'stateful' : 'stateless'} mode`);

    await server.connect(transport);

    const http = await import('http');
    const httpServer = http.createServer(async (req, res) => {
      if (req.url === '/health') {
        // Simple health check endpoint
        if (req.method === 'HEAD') {
          res.writeHead(200).end();
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            name: 'opta-api-docs-mcp',
            version: '1.0.0',
            time: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            cache: htmlCacheManager.getCacheStatus(),
          })
        );
        return;
      }
      if (req.url === '/mcp') {
        try {
          // Normalize Accept header for broader client compatibility
          const originalAccept = req.headers['accept'] as string | undefined;
          if (req.method === 'POST') {
            const parts = (originalAccept ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
            const needJson = !parts.includes('application/json');
            const needSse = !parts.includes('text/event-stream');
            if (needJson || needSse) {
              const combined = new Set(parts);
              if (needJson) combined.add('application/json');
              if (needSse) combined.add('text/event-stream');
              req.headers['accept'] = Array.from(combined).join(', ');
              console.log(`[HTTP COMPAT] Normalized Accept header for POST: "${originalAccept}" -> "${req.headers['accept']}"`);
            }
          } else if (req.method === 'GET') {
            const hasSse = (originalAccept ?? '').toLowerCase().includes('text/event-stream');
            if (!hasSse) {
              req.headers['accept'] = 'text/event-stream';
              console.log(`[HTTP COMPAT] Added SSE Accept header for GET: "${originalAccept}" -> "${req.headers['accept']}"`);
            }
          }

          await transport.handleRequest(req as any, res as any);
        } catch (err) {
          console.error('HTTP /mcp error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    httpServer.listen(Number(port), () => {
      console.log(`HTTP MCP server listening on port ${port} at path /mcp`);
    });
  } else {
    console.log('MCP server started for STDIO transport (local clients)');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('MCP server connected and ready');
  }
}

main().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});