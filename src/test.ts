import 'dotenv/config';
import { OptaScraper } from './services/optaScraper.js';
import { DocumentationManager } from './services/documentationManager.js';
import { OptaCredentials } from './types/index.js';

async function testOptaConnection() {
  console.log('🧪 Starting OPTA connection tests...\n');

  // Verify environment variables
  const credentials: OptaCredentials = {
    username: process.env.OPTA_USERNAME || '',
    password: process.env.OPTA_PASSWORD || '',
  };

  if (!credentials.username || !credentials.password) {
    console.error('❌ Error: OPTA_USERNAME and OPTA_PASSWORD must be configured in .env');
    process.exit(1);
  }

  console.log('✅ Environment variables configured');

  // Create scraper instance
  const scraper = new OptaScraper(credentials);
  const docManager = new DocumentationManager(scraper);

  try {
    // Test authentication
    console.log('\n🔐 Testing authentication...');
    const isAuthenticated = await scraper.authenticate();
    
    if (isAuthenticated) {
      console.log('✅ Authentication successful');
    } else {
      console.log('❌ Authentication error');
      process.exit(1);
    }

    // Test endpoint scraping
    console.log('\n📄 Testing endpoint scraping...');
    const testUrl = '/docs/rh/sdapi/Topics/soccer/opta-sdapi-soccer-api-possession-events.htm';
    const scrapingResult = await scraper.scrapeEndpoint(testUrl);
    
    if (scrapingResult.success) {
      console.log('✅ Scraping successful');
      console.log(`📊 Content extracted: ${scrapingResult.content?.length || 0} characters`);
    } else {
      console.log('❌ Scraping error:', scrapingResult.error);
    }

    // Test endpoint discovery
    console.log('\n🔍 Testing endpoint discovery...');
    const endpoints = await docManager.getDocumentation();
    console.log(`✅ Discovered ${endpoints.endpoints.length} endpoints`);
    
    if (endpoints.endpoints.length > 0) {
      console.log('\n📋 Found endpoints:');
      endpoints.endpoints.forEach((endpoint, index) => {
        console.log(`${index + 1}. ${endpoint.name} (${endpoint.category})`);
      });
    }

    // Test search
    console.log('\n🔎 Testing search...');
    const searchResults = await docManager.searchDocumentation('possession');
    console.log(`✅ Found ${searchResults.length} results for "possession"`);
    
    if (searchResults.length > 0) {
      console.log('\n🎯 Search results:');
      searchResults.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. ${result.endpoint.name} (Relevance: ${result.relevance})`);
      });
    }

    // Test cache status
    console.log('\n💾 Testing cache status...');
    const cacheStatus = docManager.getCacheStatus();
    console.log(`✅ Cache: ${cacheStatus.hasCache ? 'Active' : 'Inactive'}`);
    console.log(`📅 Last updated: ${cacheStatus.lastUpdated?.toISOString() || 'N/A'}`);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during tests:', error);
    process.exit(1);
  }
}

// Run tests
testOptaConnection().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 