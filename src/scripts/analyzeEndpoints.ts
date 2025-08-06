import 'dotenv/config';
import { OptaCredentials } from '../types/index.js';
import { EndpointAnalyzer } from '../utils/endpointAnalyzer.js';
import { DocumentationManager } from '../services/documentationManager.js';
import { OptaScraper } from '../services/optaScraper.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to analyze OPTA endpoints and generate a report
 * This can be run by the Cursor agent to detect new endpoints
 */
async function analyzeEndpoints() {
  console.log('🔍 Starting OPTA endpoint analysis...\n');

  // Verify environment variables
  const credentials: OptaCredentials = {
    username: process.env.OPTA_USERNAME || '',
    password: process.env.OPTA_PASSWORD || '',
  };

  if (!credentials.username || !credentials.password) {
    console.error('❌ Error: OPTA_USERNAME and OPTA_PASSWORD must be configured in .env');
    process.exit(1);
  }

  try {
    // Initialize services
    const scraper = new OptaScraper(credentials);
    const docManager = new DocumentationManager(scraper);
    
    // Get current known endpoints
    const currentDocumentation = await docManager.getDocumentation();
    const knownEndpoints = currentDocumentation.endpoints;
    
    console.log(`📊 Current known endpoints: ${knownEndpoints.length}`);
    
    // Initialize analyzer
    const analyzer = new EndpointAnalyzer(credentials, knownEndpoints);
    
    // Perform analysis
    const analysis = await analyzer.analyzeForNewEndpoints();
    
    // Generate report
    const report = analyzer.createAnalysisReport(analysis);
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'analysis-report.md');
    fs.writeFileSync(reportPath, report);
    
    // Display summary
    console.log('\n📋 Analysis Summary:');
    console.log(`- New endpoints found: ${analysis.newEndpoints.length}`);
    console.log(`- Categories discovered: ${analysis.categories.length}`);
    console.log(`- Report saved to: ${reportPath}`);
    
    if (analysis.newEndpoints.length > 0) {
      console.log('\n🎯 New endpoints discovered:');
      analysis.newEndpoints.forEach((endpoint, index) => {
        console.log(`${index + 1}. ${endpoint.name} (${endpoint.category})`);
        console.log(`   URL: ${endpoint.url}`);
      });
      
      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach(rec => {
        console.log(`- ${rec}`);
      });
    } else {
      console.log('\n✅ No new endpoints found - all endpoints are already covered!');
    }
    
    // Return analysis data for agent processing
    return {
      success: true,
      analysis,
      reportPath,
      newEndpointsCount: analysis.newEndpoints.length
    };
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for use by agents
export { analyzeEndpoints };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeEndpoints().then(result => {
    if (result.success) {
      console.log('\n🎉 Analysis completed successfully!');
      process.exit(0);
    } else {
      console.error('\n❌ Analysis failed!');
      process.exit(1);
    }
  });
} 