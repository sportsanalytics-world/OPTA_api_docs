import 'dotenv/config';
import { DocumentationManager } from './services/documentationManager.js';
import { OptaScraper } from './services/optaScraper.js';
import { OptaCredentials } from './types/index.js';

async function testOPTAFunctions() {
  console.log('🧪 Probando funciones de OPTA directamente...\n');

  // Configurar credenciales
  const credentials: OptaCredentials = {
    username: process.env.OPTA_USERNAME || '',
    password: process.env.OPTA_PASSWORD || '',
  };

  if (!credentials.username || !credentials.password) {
    console.error('❌ Error: OPTA_USERNAME y OPTA_PASSWORD deben estar configurados en .env');
    return;
  }

  const baseUrl = process.env.OPTA_DOCS_BASE_URL || 'https://docs.performgroup.com/docs/rh/sdapi';
  
  // Inicializar servicios
  const scraper = new OptaScraper(credentials, baseUrl);
  const docManager = new DocumentationManager(scraper);

  try {
      // Test 1: Verify authentication
  console.log('🔐 Verifying authentication...');
    const isAuthenticated = await scraper.authenticate();
    if (isAuthenticated) {
      console.log('✅ Authentication successful\n');
    } else {
      console.log('❌ Authentication error\n');
      return;
    }

    // Test 2: Cache status
    console.log('📊 Cache status:');
    const cacheStatus = docManager.getCacheStatus();
    console.log(`- Has cache: ${cacheStatus.hasCache ? 'Yes' : 'No'}`);
    console.log(`- Cache expired: ${cacheStatus.isExpired ? 'Yes' : 'No'}`);
    console.log(`- Last update: ${cacheStatus.lastUpdated ? cacheStatus.lastUpdated.toISOString() : 'N/A'}\n`);

    // Test 3: Get complete documentation
    console.log('📚 Getting complete documentation...');
    const documentation = await docManager.getDocumentation();
    console.log(`✅ Documentation obtained with ${documentation.endpoints.length} endpoints\n`);

    // Test 4: Search documentation
    console.log('🔍 Searching documentation for "soccer"...');
    const searchResults = await docManager.searchDocumentation('soccer');
    if (searchResults.length > 0) {
      console.log(`✅ Found ${searchResults.length} results:`);
      searchResults.slice(0, 3).forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.endpoint.name} - ${result.endpoint.url}`);
        console.log(`     Category: ${result.endpoint.category}`);
        console.log(`     Relevance: ${result.relevance}`);
      });
      if (searchResults.length > 3) {
        console.log(`  ... and ${searchResults.length - 3} more`);
      }
    } else {
      console.log('❌ No results found');
    }
    console.log('');

    // Test 5: List endpoints by category
    console.log('📋 Listing endpoints by category...');
    const categories = [...new Set(documentation.endpoints.map(ep => ep.category))];
    console.log(`✅ Categories found: ${categories.join(', ')}\n`);

    // Test 6: Show some example endpoints
    if (documentation.endpoints.length > 0) {
      console.log('📝 Example endpoints:');
      documentation.endpoints.slice(0, 5).forEach((endpoint, index) => {
        console.log(`  ${index + 1}. ${endpoint.name}`);
        console.log(`     URL: ${endpoint.url}`);
        console.log(`     Category: ${endpoint.category}`);
        console.log(`     Description: ${endpoint.description || 'Not available'}`);
        console.log('');
      });
    }

    // Test 7: Get details of a specific endpoint
    if (documentation.endpoints.length > 0) {
      const firstEndpoint = documentation.endpoints[0];
      console.log(`🔍 Getting details of: ${firstEndpoint.name}`);
      const details = await docManager.getEndpointByUrl(firstEndpoint.url);
      if (details) {
        console.log(`✅ Details obtained:`);
        console.log(`  - URL: ${details.url}`);
        console.log(`  - Category: ${details.category}`);
        console.log(`  - Description: ${details.description || 'Not available'}`);
        if (details.content) {
          console.log(`  - Content: ${details.content.substring(0, 100)}...`);
        }
      } else {
        console.log('❌ Could not obtain details');
      }
    }

  } catch (error) {
    console.error('❌ Error during tests:', error);
  }
}

// Run tests
testOPTAFunctions().catch(console.error); 