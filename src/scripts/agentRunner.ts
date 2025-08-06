import 'dotenv/config';
import { analyzeEndpoints } from './analyzeEndpoints.js';
import { generateEndpointTestTemplate, generateTestSuite } from '../templates/testTemplate.js';
import { EndpointAnalyzer } from '../utils/endpointAnalyzer.js';
import { DocumentationManager } from '../services/documentationManager.js';
import { OptaScraper } from '../services/optaScraper.js';
import { OptaCredentials } from '../types/index.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Main agent runner that can be called by Cursor background agent
 */
async function runAgentAnalysis() {
  console.log('🤖 Starting OPTA Endpoint Detection Agent...\n');

  // Verify environment variables
  const credentials: OptaCredentials = {
    username: process.env.OPTA_USERNAME || '',
    password: process.env.OPTA_PASSWORD || '',
  };

  if (!credentials.username || !credentials.password) {
    console.error('❌ Error: OPTA_USERNAME and OPTA_PASSWORD must be configured in .env');
    return { success: false, error: 'Missing credentials' };
  }

  try {
    // Step 1: Run endpoint analysis
    console.log('🔍 Step 1: Running endpoint analysis...');
    const analysisResult = await analyzeEndpoints();
    
    if (!analysisResult.success) {
      return analysisResult;
    }

    const { analysis } = analysisResult;
    
    // Step 2: Generate tests for new endpoints
    if (analysis.newEndpoints.length > 0) {
      console.log('\n🧪 Step 2: Generating tests for new endpoints...');
      
      // Create tests directory if it doesn't exist
      const testsDir = path.join(process.cwd(), 'src', 'tests', 'new-endpoints');
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }

      // Generate individual test files
      for (const endpoint of analysis.newEndpoints) {
        const testContent = generateEndpointTestTemplate(endpoint);
        const testFileName = `${endpoint.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.test.ts`;
        const testFilePath = path.join(testsDir, testFileName);
        
        fs.writeFileSync(testFilePath, testContent);
        console.log(`✅ Generated test: ${testFileName}`);
      }

      // Generate test suite
      const testSuiteContent = generateTestSuite(analysis.newEndpoints);
      const testSuitePath = path.join(testsDir, 'new-endpoints-suite.test.ts');
      fs.writeFileSync(testSuitePath, testSuiteContent);
      console.log('✅ Generated test suite: new-endpoints-suite.test.ts');
    }

    // Step 3: Update endpoint discovery logic
    if (analysis.newEndpoints.length > 0) {
      console.log('\n🔧 Step 3: Updating endpoint discovery logic...');
      await updateEndpointDiscovery(analysis.newEndpoints);
    }

    // Step 4: Generate comprehensive report
    console.log('\n📊 Step 4: Generating comprehensive report...');
    const comprehensiveReport = generateComprehensiveReport(analysis, analysisResult.reportPath);
    
    const reportPath = path.join(process.cwd(), 'agent-analysis-report.md');
    fs.writeFileSync(reportPath, comprehensiveReport);
    
    console.log(`✅ Comprehensive report saved to: ${reportPath}`);

    return {
      success: true,
      analysis,
      newEndpointsCount: analysis.newEndpoints.length,
      testsGenerated: analysis.newEndpoints.length,
      reportPath
    };

  } catch (error) {
    console.error('❌ Error during agent analysis:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update the endpoint discovery logic with new endpoints
 */
async function updateEndpointDiscovery(newEndpoints: any[]) {
  const scraperPath = path.join(process.cwd(), 'src', 'services', 'optaScraper.ts');
  let scraperContent = fs.readFileSync(scraperPath, 'utf-8');
  
  // Find the known endpoints array
  const knownEndpointsPattern = /const knownEndpoints = \[([\s\S]*?)\];/;
  const match = scraperContent.match(knownEndpointsPattern);
  
  if (match) {
    const existingEndpoints = match[1];
    const newEndpointsCode = newEndpoints.map(endpoint => `
        {
          name: '${endpoint.name}',
          url: '${endpoint.url}',
          category: '${endpoint.category}',
          description: '${endpoint.description || `API for ${endpoint.name.toLowerCase()}`}'
        }`).join(',');
    
    const updatedEndpoints = existingEndpoints + newEndpointsCode;
    const updatedContent = scraperContent.replace(knownEndpointsPattern, 
      `const knownEndpoints = [${updatedEndpoints}];`);
    
    fs.writeFileSync(scraperPath, updatedContent);
    console.log('✅ Updated endpoint discovery logic');
  }
}

/**
 * Generate comprehensive report
 */
function generateComprehensiveReport(analysis: any, originalReportPath: string): string {
  const timestamp = new Date().toISOString();
  
  return `# 🤖 OPTA Agent Analysis Report

**Generated**: ${timestamp}
**Agent Version**: 1.0.0

## 📊 Executive Summary

- **Total Endpoints Analyzed**: ${analysis.newEndpoints.length + analysis.existingEndpoints.length}
- **New Endpoints Found**: ${analysis.newEndpoints.length}
- **Existing Endpoints**: ${analysis.existingEndpoints.length}
- **Categories Discovered**: ${analysis.categories.length}
- **URL Patterns Identified**: ${analysis.patterns.length}

## 🎯 New Endpoints

${analysis.newEndpoints.length > 0 ? 
  analysis.newEndpoints.map((ep: any, index: number) => 
    `${index + 1}. **${ep.name}**
   - URL: \`${ep.url}\`
   - Category: ${ep.category}
   - Description: ${ep.description || 'No description available'}
   - Status: ✅ Test generated`).join('\n\n') : 
  'No new endpoints discovered - all endpoints are already covered! ✅'}

## 📁 Generated Files

${analysis.newEndpoints.length > 0 ? 
  `- \`src/tests/new-endpoints/\` - Individual test files
- \`src/tests/new-endpoints/new-endpoints-suite.test.ts\` - Comprehensive test suite
- \`agent-analysis-report.md\` - This report` : 
  '- No new files generated (no new endpoints found)'}

## 🔧 Recommendations

${analysis.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## 🧪 Test Coverage

${analysis.newEndpoints.length > 0 ? 
  `Generated ${analysis.newEndpoints.length} test files covering:
- Endpoint discovery tests
- Content scraping tests
- Search functionality tests
- Error handling tests
- Integration tests` : 
  'No new tests needed - all endpoints are already covered'}

## 📈 Next Steps

1. **Review Generated Tests**: Check the test files in \`src/tests/new-endpoints/\`
2. **Run Tests**: Execute \`npm test\` to verify new tests pass
3. **Update Documentation**: Consider updating README.md with new endpoints
4. **Monitor Performance**: Watch for any performance impacts from new endpoints

## 🔍 Technical Details

### Categories Found
${analysis.categories.map((cat: string) => `- ${cat}`).join('\n')}

### URL Patterns
${analysis.patterns.map((pattern: string) => `- \`${pattern}\``).join('\n')}

### Original Report
See \`${originalReportPath}\` for the original analysis report.

---
*Report generated by OPTA Endpoint Detection Agent v1.0.0*
`;
}

// Export for use by background agent
export { runAgentAnalysis };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgentAnalysis().then(result => {
    if (result.success) {
      console.log('\n🎉 Agent analysis completed successfully!');
      console.log(`📊 Found ${result.newEndpointsCount} new endpoints`);
      console.log(`🧪 Generated ${result.testsGenerated} test files`);
      process.exit(0);
    } else {
      console.error('\n❌ Agent analysis failed!');
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  });
} 