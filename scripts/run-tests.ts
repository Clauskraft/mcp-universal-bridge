/**
 * Test Runner Script
 *
 * Executes comprehensive test suite and generates reports
 */

import { testOrchestrator } from '../src/tests/test-orchestrator.js';

async function runTests() {
  console.log('🚀 Starting MCP Universal Bridge Test Suite\n');
  console.log('=' .repeat(60));
  console.log('Test Configuration:');
  console.log('  - Unit Tests: Component and function testing');
  console.log('  - E2E Tests: Complete workflow validation');
  console.log('  - Flow Tests: Multi-step user journeys');
  console.log('  - Usability Tests: 100 diverse tech scenarios');
  console.log('=' + '='.repeat(60) + '\n');

  try {
    const results = await testOrchestrator.runAll();

    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(testOrchestrator.generateReport());
    console.log('='.repeat(60) + '\n');

    // Exit with appropriate code
    const hasFailures = results.summary.failed > 0;
    process.exit(hasFailures ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
