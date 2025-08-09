import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { OptaCredentials } from '../types/index.js';

interface DiscoveredEndpoint {
  name: string;
  url: string;
  category: string;
  description?: string;
  code?: string;
}

class OptaEndpointProcessor {
  private credentials: OptaCredentials;
  private baseUrl: string;

  constructor(credentials: OptaCredentials, baseUrl: string = 'https://docs.performgroup.com') {
    this.credentials = credentials;
    this.baseUrl = baseUrl;
  }

  async processHtmlFile(filePath: string): Promise<DiscoveredEndpoint[]> {
    console.log('📄 Procesando archivo HTML de endpoints...\n');
    
    try {
      const htmlContent = fs.readFileSync(filePath, 'utf-8');
      const $ = cheerio.load(htmlContent);
      const endpoints: DiscoveredEndpoint[] = [];

      // Procesar todos los enlaces en la lista
      $('a[href*=".htm"], a[href*=".html"]').each((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).attr('title');
        const text = $(element).text().trim();
        
        if (href && this.isOptaEndpoint(href)) {
          const url = this.normalizeUrl(href);
          const name = title || text || this.extractNameFromUrl(url);
          const category = this.extractCategory(url);
          const code = this.extractCode(text);
          
          endpoints.push({
            name,
            url,
            category,
            description: `Documentation for ${name}`,
            code
          });
        }
      });

      console.log(`✅ Procesados ${endpoints.length} endpoints del archivo HTML`);
      return endpoints;
    } catch (error) {
      console.error('❌ Error procesando archivo HTML:', error);
      return [];
    }
  }

  private isOptaEndpoint(href: string): boolean {
    return href.includes('opta-sdapi') || 
           href.includes('opta-sdapiamp') ||
           href.includes('Topics/soccer');
  }

  private normalizeUrl(href: string): string {
    if (href.startsWith('../../')) {
      let url = href.replace('../../', '/docs/rh/sdapi/');
      // Corregir el "amp" extra en las URLs
      url = url.replace('opta-sdapiamp-', 'opta-sdapi-');
      return url;
    }
    
    if (href.startsWith('../')) {
      return href.replace('../', '/');
    }
    
    if (href.startsWith('./')) {
      return href.replace('./', '/');
    }
    
    if (!href.startsWith('/') && !href.startsWith('http')) {
      return `/${href}`;
    }
    
    return href;
  }

  private extractNameFromUrl(url: string): string {
    const filename = url.split('/').pop()?.replace(/\.(htm|html)$/, '') || '';
    
    return filename
      .replace(/opta-sdapi(amp)?-/g, '')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractCategory(url: string): string {
    const parts = url.split('/');
    
            // Search for known categories
    const knownCategories = ['soccer', 'football', 'basketball', 'tennis', 'cricket'];
    
    for (const category of knownCategories) {
      if (parts.includes(category)) {
        return category;
      }
    }
    
    return 'soccer'; // Por defecto, ya que todos los endpoints son de soccer
  }

  private extractCode(text: string): string | undefined {
            // Extract code from text (e.g., "Match Events (MA3)")
    const match = text.match(/\(([A-Z]{2,3}\d+)\)/);
    return match ? match[1] : undefined;
  }

  async testEndpoints(endpoints: DiscoveredEndpoint[]): Promise<void> {
    console.log('\n🧪 Testing extracted endpoints...\n');
    
    const testResults = {
      successful: 0,
      failed: 0,
      total: endpoints.length
    };

    // Probar solo los primeros 10 endpoints para no sobrecargar
    const endpointsToTest = endpoints.slice(0, 10);
    
    for (const endpoint of endpointsToTest) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint.url}`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64')}`
          }
        });
        
        if (response.ok) {
          console.log(`✅ ${endpoint.name} (${endpoint.code}) - Status: ${response.status}`);
          testResults.successful++;
        } else {
          console.log(`❌ ${endpoint.name} (${endpoint.code}) - Status: ${response.status}`);
          testResults.failed++;
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name} (${endpoint.code}) - Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        testResults.failed++;
      }
    }

    console.log(`\n📊 Resultados de prueba:`);
    console.log(`- Exitosos: ${testResults.successful}`);
    console.log(`- Fallidos: ${testResults.failed}`);
    console.log(`- Total probados: ${endpointsToTest.length}`);
  }

  categorizeEndpoints(endpoints: DiscoveredEndpoint[]): Record<string, DiscoveredEndpoint[]> {
    const categories: Record<string, DiscoveredEndpoint[]> = {};
    
    endpoints.forEach(endpoint => {
      const category = endpoint.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(endpoint);
    });
    
    return categories;
  }
}

async function main() {
  console.log('🚀 Procesando endpoints de OPTA desde archivo HTML...\n');

  // Verificar variables de entorno
  const credentials: OptaCredentials = {
    username: process.env.OPTA_USERNAME || '',
    password: process.env.OPTA_PASSWORD || '',
  };

  if (!credentials.username || !credentials.password) {
    console.error('❌ Error: OPTA_USERNAME y OPTA_PASSWORD deben estar configurados en .env');
    process.exit(1);
  }

  const processor = new OptaEndpointProcessor(credentials);
  
          // Path to HTML file (adjust according to where you have it)
  const htmlFilePath = path.join(process.cwd(), 'ul_endpoints_opta.html');
  
  if (!fs.existsSync(htmlFilePath)) {
          console.error(`❌ File not found: ${htmlFilePath}`);
    console.log('💡 Make sure the ul_endpoints_opta.html file is in the project root directory');
    process.exit(1);
  }

  try {
    // Procesar endpoints del archivo HTML
    const endpoints = await processor.processHtmlFile(htmlFilePath);
    
    if (endpoints.length > 0) {
      console.log('\n📋 Endpoints encontrados:');
      endpoints.forEach((endpoint, index) => {
        console.log(`${index + 1}. ${endpoint.name}${endpoint.code ? ` (${endpoint.code})` : ''}`);
        console.log(`   URL: ${endpoint.url}`);
        console.log(`   Category: ${endpoint.category}`);
        console.log('');
      });
      
      // Categorizar endpoints
      const categories = processor.categorizeEndpoints(endpoints);
      console.log('\n📂 Categories found:');
      Object.entries(categories).forEach(([category, categoryEndpoints]) => {
        console.log(`- ${category}: ${categoryEndpoints.length} endpoints`);
      });
      
      // Probar algunos endpoints (comentado para evitar colgarse)
      // await processor.testEndpoints(endpoints);
      
      // Guardar resultados
      const results = {
        timestamp: new Date().toISOString(),
        totalEndpoints: endpoints.length,
        categories: Object.keys(categories),
        endpoints: endpoints
      };
      
      fs.writeFileSync('processed-endpoints.json', JSON.stringify(results, null, 2));
      console.log('\n💾 Resultados guardados en processed-endpoints.json');
      
      // Crear archivo de resumen
      const summary = `# Endpoints de OPTA API

## Resumen
- **Total de endpoints**: ${endpoints.length}
    - **Categories**: ${Object.keys(categories).join(', ')}
- **Fecha de procesamiento**: ${new Date().toLocaleString()}

## Endpoints by category

${Object.entries(categories).map(([category, categoryEndpoints]) => `
### ${category.toUpperCase()} (${categoryEndpoints.length} endpoints)
${categoryEndpoints.map(ep => `- ${ep.name}${ep.code ? ` (${ep.code})` : ''}`).join('\n')}
`).join('\n')}

## Lista completa
${endpoints.map((ep, index) => `${index + 1}. ${ep.name}${ep.code ? ` (${ep.code})` : ''} - ${ep.url}`).join('\n')}
`;

      fs.writeFileSync('endpoints-summary.md', summary);
      console.log('📝 Resumen guardado en endpoints-summary.md');
      
    } else {
      console.log('\n❌ No se encontraron endpoints en el archivo HTML');
    }
    
  } catch (error) {
    console.error('❌ Error durante el procesamiento:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { OptaEndpointProcessor }; 