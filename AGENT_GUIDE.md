# 🚀 Cursor Agent Guide - Endpoint Detector

## Overview

This guide explains how to use the **Endpoint Detector Agent** to automatically discover new OPTA API endpoints and generate comprehensive tests for them.

## 🎯 What the Agent Does

The Endpoint Detector Agent is designed to:

1. **🔍 Discover New Endpoints**: Automatically scan OPTA documentation to find endpoints not currently covered
2. **🧪 Generate Tests**: Create comprehensive test suites for newly discovered endpoints
3. **📊 Analyze Patterns**: Identify new categories and URL patterns in the documentation
4. **📝 Generate Reports**: Create detailed analysis reports with recommendations

## 🛠️ How to Use the Agent

### Step 1: Activate the Agent

1. Open Cursor
2. Go to the Command Palette (`Cmd/Ctrl + Shift + P`)
3. Type "Agent" and select "Run Agent"
4. Choose "Endpoint Detector Agent" from the list

### Step 2: Run the Analysis

The agent will automatically:

1. **Check Environment**: Verify that OPTA credentials are configured
2. **Discover Endpoints**: Scan OPTA documentation for new endpoints
3. **Compare with Known**: Identify endpoints not in the current system
4. **Generate Report**: Create a detailed analysis report
5. **Suggest Tests**: Propose test cases for new endpoints

### Step 3: Review Results

The agent will provide:

- **Analysis Report**: Saved as `analysis-report.md`
- **New Endpoints List**: Endpoints that need to be added
- **Test Recommendations**: Suggested test cases
- **Category Analysis**: New categories discovered

### Step 4: Generate Tests

If new endpoints are found, the agent can:

1. **Create Individual Tests**: Generate specific test files for each endpoint
2. **Create Test Suite**: Generate a comprehensive test suite
3. **Update Discovery Logic**: Add new endpoints to the discovery system

## 📋 Available Commands

### Manual Analysis
```bash
npm run analyze:endpoints
```

### Run Tests
```bash
npm test
```

### Test OPTA Connection
```bash
npm run test:opta
```

## 📁 Generated Files

When the agent runs, it creates:

- `analysis-report.md` - Detailed analysis report
- `src/tests/new-endpoints/` - Generated test files
- `src/tests/new-endpoints-suite.test.ts` - Comprehensive test suite

## 🔧 Configuration

### Environment Variables
Make sure these are set in your `.env` file:
```env
OPTA_USERNAME=your_username
OPTA_PASSWORD=your_password
OPTA_DOCS_BASE_URL=https://docs.performgroup.com/docs/rh/sdapi
```

### Agent Settings
The agent configuration is in `.cursor/agents/endpoint-detector.json`

## 📊 Understanding the Analysis

### New Endpoints
Endpoints discovered that aren't in the current system:
- **Name**: Human-readable endpoint name
- **URL**: Full URL to the documentation
- **Category**: Endpoint category (e.g., soccer, statistics)
- **Description**: Brief description of the endpoint

### Categories
New categories discovered in the documentation:
- Helps organize endpoints logically
- Suggests new filtering options
- Indicates new API areas

### Patterns
URL patterns that could be used for discovery:
- Helps improve automatic discovery
- Suggests new search strategies
- Identifies documentation structure

## 🧪 Test Generation

The agent generates several types of tests:

### 1. Discovery Tests
- Verify endpoints are discoverable
- Check correct categorization
- Test URL pattern matching

### 2. Scraping Tests
- Test successful content extraction
- Verify content quality
- Handle error scenarios

### 3. Search Tests
- Test search functionality
- Verify relevance scoring
- Check result accuracy

### 4. Integration Tests
- Test MCP server integration
- Verify cache functionality
- Test error handling

## 🚨 Troubleshooting

### Common Issues

**Authentication Errors**
- Verify OPTA credentials in `.env`
- Check network connectivity
- Ensure account has documentation access

**No New Endpoints Found**
- All endpoints may already be covered
- Check if discovery is working correctly
- Verify URL patterns are correct

**Test Generation Fails**
- Check TypeScript compilation
- Verify Jest configuration
- Ensure all dependencies are installed

### Debug Mode

Run with verbose logging:
```bash
DEBUG=* npm run analyze:endpoints
```

## 📈 Best Practices

1. **Regular Analysis**: Run the agent weekly to catch new endpoints
2. **Review Reports**: Always review the analysis report before implementing
3. **Test Coverage**: Ensure all new endpoints have comprehensive tests
4. **Documentation**: Update documentation when new endpoints are added
5. **Validation**: Manually verify critical endpoints before deployment

## 🔄 Workflow

### Daily Workflow
1. Run agent analysis
2. Review new endpoints
3. Generate tests for important endpoints
4. Update documentation

### Weekly Workflow
1. Comprehensive analysis
2. Full test suite generation
3. Performance review
4. Documentation updates

## 📞 Support

If you encounter issues:

1. Check the analysis report for details
2. Review the troubleshooting section
3. Check environment configuration
4. Verify OPTA credentials and access

## 🎉 Success Metrics

The agent is successful when:

- ✅ New endpoints are discovered automatically
- ✅ Comprehensive tests are generated
- ✅ No false positives in endpoint detection
- ✅ Tests pass consistently
- ✅ Documentation stays up-to-date

---

**Happy Endpoint Hunting! 🎯** 