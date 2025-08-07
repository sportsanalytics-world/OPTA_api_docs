import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { OptaCredentials } from '../types/index.js';

interface DiscoveredEndpoint {
  name: string;
  url: string;
  category: string;
  description?: string;
}

class EndpointExplorer {
  private credentials: OptaCredentials;
  private baseUrl: string;

  constructor(credentials: OptaCredentials, baseUrl: string = 'https://docs.performgroup.com') {
    this.credentials = credentials;
    this.baseUrl = baseUrl;
  }

  async exploreDocumentation(): Promise<DiscoveredEndpoint[]> {
    console.log('🔍 Exploring OPTA documentation...\n');
    
    const endpoints: DiscoveredEndpoint[] = [];
    
    // Lista de URLs conocidas para explorar
    const knownPaths = [
      '/docs/rh/sdapi/',
      '/docs/rh/sdapi/soccer/',
      '/docs/rh/sdapi/soccer/Topics/',
      '/docs/data/',
      '/docs/rh/'
    ];

    for (const path of knownPaths) {
      console.log(`🌐 Explorando: ${path}`);
      try {
        const pathEndpoints = await this.explorePath(path);
        endpoints.push(...pathEndpoints);
        console.log(`✅ Encontrados ${pathEndpoints.length} endpoints en ${path}`);
      } catch (error) {
        console.log(`❌ Error explorando ${path}:`, error instanceof Error ? error.message : 'Error desconocido');
      }
    }

    // Remover duplicados
    const uniqueEndpoints = this.removeDuplicates(endpoints);
    console.log(`\n🎯 Total unique endpoints found: ${uniqueEndpoints.length}`);
    
    return uniqueEndpoints;
  }

  private async explorePath(path: string): Promise<DiscoveredEndpoint[]> {
    try {
      const response = await axios.get(`${this.baseUrl}${path}`, {
        auth: {
          username: this.credentials.username,
          password: this.credentials.password
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const endpoints: DiscoveredEndpoint[] = [];

              // Search for links pointing to API documentation
      $('a[href*=".htm"]').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        
        if (href && text && this.isApiDocumentation(href)) {
          const url = this.normalizeUrl(href, path);
          const name = this.extractName(text, url);
          const category = this.extractCategory(url);
          
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
      console.log(`⚠️  No se pudo acceder a ${path}`);
      return [];
    }
  }

  private isApiDocumentation(href: string): boolean {
    return href.includes('opta') || 
           href.includes('api') || 
           href.includes('Topics') ||
           href.includes('soccer') ||
           href.includes('football');
  }

  private normalizeUrl(href: string, basePath: string): string {
    if (href.startsWith('http')) {
      return href.replace(this.baseUrl, '');
    }
    
    if (href.startsWith('/')) {
      return href;
    }
    
    // Construir URL relativa
    const baseDir = basePath.split('/').slice(0, -1).join('/');
    return `${baseDir}/${href}`;
  }

  private extractName(text: string, url: string): string {
    if (text && text.length > 3) {
      return text.trim();
    }
    
    // Extraer del URL si no hay texto
    const filename = url.split('/').pop()?.replace('.htm', '') || '';
    return filename
      .replace(/opta-sdapi-/g, '')
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
    
    // Buscar en la estructura de directorios
    const soccerIndex = parts.findIndex(part => part === 'soccer');
    if (soccerIndex !== -1 && parts[soccerIndex + 1]) {
      return parts[soccerIndex + 1];
    }
    
    return 'general';
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

  async testKnownEndpoints(): Promise<void> {
    console.log('\n🧪 Probando endpoints conocidos...\n');
    
    const knownEndpoints = [
      '/Topics/soccer/opta-sdapi-soccer-api-possession-events.htm',
      '/Topics/soccer/opta-sdapi-soccer-api-match-events.htm',
      '/Topics/soccer/opta-sdapi-soccer-api-player-statistics.htm',
      '/docs/rh/sdapi/soccer/Topics/opta-sdapi-soccer-api-possession-events.htm',
      '/docs/rh/sdapi/soccer/Topics/opta-sdapi-soccer-api-match-events.htm'
    ];

    for (const endpoint of knownEndpoints) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          auth: {
            username: this.credentials.username,
            password: this.credentials.password
          },
          timeout: 5000
        });
        
        console.log(`✅ ${endpoint} - Status: ${response.status}`);
      } catch (error) {
        const status = error instanceof Error && 'response' in error ? 
          (error as any).response?.status : 'Error';
        console.log(`❌ ${endpoint} - Status: ${status}`);
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting OPTA endpoints exploration...\n');

  // Verificar variables de entorno
  const credentials: OptaCredentials = {
    username: process.env.OPTA_USERNAME || '',
    password: process.env.OPTA_PASSWORD || '',
  };

  if (!credentials.username || !credentials.password) {
    console.error('❌ Error: OPTA_USERNAME y OPTA_PASSWORD deben estar configurados en .env');
    process.exit(1);
  }

  const explorer = new EndpointExplorer(credentials);

  try {
    // Probar endpoints conocidos primero
    await explorer.testKnownEndpoints();
    
            // Explore documentation
    const endpoints = await explorer.exploreDocumentation();
    
    if (endpoints.length > 0) {
      console.log('\n📋 Endpoints encontrados:');
      endpoints.forEach((endpoint, index) => {
        console.log(`${index + 1}. ${endpoint.name}`);
        console.log(`   URL: ${endpoint.url}`);
        console.log(`   Category: ${endpoint.category}`);
        console.log('');
      });
      
      // Guardar resultados
      const fs = await import('fs');
      const results = {
        timestamp: new Date().toISOString(),
        totalEndpoints: endpoints.length,
        endpoints: endpoints
      };
      
      fs.writeFileSync('discovered-endpoints.json', JSON.stringify(results, null, 2));
      console.log('💾 Resultados guardados en discovered-endpoints.json');
    } else {
      console.log('\n❌ No se encontraron endpoints');
    }
    
  } catch (error) {
          console.error('❌ Error during exploration:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { EndpointExplorer }; 