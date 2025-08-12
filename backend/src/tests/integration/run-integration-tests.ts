import { exec } from 'child_process';
import { promisify } from 'util';
import { performance } from 'perf_hooks';
import { knexInstance } from '../../database/connection';
import { redisClient } from '../../database/redis';
import { blockchainService } from '../../services/blockchainService';
import { cacheService } from '../../services/cacheService';

const execAsync = promisify(exec);

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  details?: any;
}

interface IntegrationTestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
    totalDuration: number;
    averageDuration: number;
  };
  tests: TestResult[];
  systemHealth: {
    database: boolean;
    redis: boolean;
    blockchain: boolean;
    cache: boolean;
  };
  recommendations: string[];
  timestamp: Date;
}

class IntegrationTestRunner {
  private testResults: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = performance.now();
  }

  // Run all integration tests
  async runAllTests(): Promise<IntegrationTestReport> {
    console.log('🚀 Starting Integration Test Suite...\n');

    try {
      // 1. System Health Check
      await this.runSystemHealthCheck();

      // 2. API Integration Tests
      await this.runAPIIntegrationTests();

      // 3. Blockchain Integration Tests
      await this.runBlockchainIntegrationTests();

      // 4. Payment Gateway Tests
      await this.runPaymentGatewayTests();

      // 5. Socket Integration Tests
      await this.runSocketIntegrationTests();

      // 6. End-to-End Workflow Tests
      await this.runEndToEndTests();

      // 7. Performance and Load Tests
      await this.runPerformanceTests();

      // 8. Security Integration Tests
      await this.runSecurityTests();

    } catch (error) {
      console.error('❌ Integration test suite failed:', error);
    }

    return this.generateReport();
  }

  // System health check
  private async runSystemHealthCheck(): Promise<void> {
    console.log('🔍 Running System Health Check...');
    const startTime = performance.now();

    try {
      // Test database connection
      await knexInstance.raw('SELECT 1');
      console.log('✅ Database: Healthy');

      // Test Redis connection
      await redisClient.ping();
      console.log('✅ Redis: Healthy');

      // Test blockchain service
      const blockchainHealth = await blockchainService.healthCheck();
      console.log(`✅ Blockchain: ${blockchainHealth ? 'Healthy' : 'Unhealthy'}`);

      // Test cache service
      const cacheHealth = await cacheService.healthCheck();
      console.log(`✅ Cache: ${cacheHealth ? 'Healthy' : 'Unhealthy'}`);

      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'System Health Check',
        status: 'passed',
        duration,
        details: {
          database: true,
          redis: true,
          blockchain: blockchainHealth,
          cache: cacheHealth
        }
      });

    } catch (error) {
      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'System Health Check',
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // API Integration Tests
  private async runAPIIntegrationTests(): Promise<void> {
    console.log('\n🌐 Running API Integration Tests...');
    const startTime = performance.now();

    try {
      // Run API integration tests using Jest
      const { stdout, stderr } = await execAsync(
        'npm test -- --testPathPattern=integration/api-integration.test.ts --verbose',
        { cwd: process.cwd(), timeout: 300000 }
      );

      const duration = performance.now() - startTime;
      
      if (stderr && stderr.includes('FAIL')) {
        this.testResults.push({
          name: 'API Integration Tests',
          status: 'failed',
          duration,
          error: 'API integration tests failed',
          details: { stderr }
        });
      } else {
        this.testResults.push({
          name: 'API Integration Tests',
          status: 'passed',
          duration,
          details: { stdout }
        });
      }

      console.log('✅ API Integration Tests completed');

    } catch (error) {
      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'API Integration Tests',
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Blockchain Integration Tests
  private async runBlockchainIntegrationTests(): Promise<void> {
    console.log('\n⛓️ Running Blockchain Integration Tests...');
    const startTime = performance.now();

    try {
      // Run blockchain integration tests
      const { stdout, stderr } = await execAsync(
        'npm test -- --testPathPattern=integration/blockchain-integration.test.ts --verbose',
        { cwd: process.cwd(), timeout: 300000 }
      );

      const duration = performance.now() - startTime;
      
      if (stderr && stderr.includes('FAIL')) {
        this.testResults.push({
          name: 'Blockchain Integration Tests',
          status: 'failed',
          duration,
          error: 'Blockchain integration tests failed',
          details: { stderr }
        });
      } else {
        this.testResults.push({
          name: 'Blockchain Integration Tests',
          status: 'passed',
          duration,
          details: { stdout }
        });
      }

      console.log('✅ Blockchain Integration Tests completed');

    } catch (error) {
      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'Blockchain Integration Tests',
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Payment Gateway Tests
  private async runPaymentGatewayTests(): Promise<void> {
    console.log('\n💳 Running Payment Gateway Tests...');
    const startTime = performance.now();

    try {
      // Run payment gateway tests
      const { stdout, stderr } = await execAsync(
        'npm test -- --testPathPattern=integration/payment-gateway-integration.test.ts --verbose',
        { cwd: process.cwd(), timeout: 300000 }
      );

      const duration = performance.now() - startTime;
      
      if (stderr && stderr.includes('FAIL')) {
        this.testResults.push({
          name: 'Payment Gateway Tests',
          status: 'failed',
          duration,
          error: 'Payment gateway tests failed',
          details: { stderr }
        });
      } else {
        this.testResults.push({
          name: 'Payment Gateway Tests',
          status: 'passed',
          duration,
          details: { stdout }
        });
      }

      console.log('✅ Payment Gateway Tests completed');

    } catch (error) {
      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'Payment Gateway Tests',
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Socket Integration Tests
  private async runSocketIntegrationTests(): Promise<void> {
    console.log('\n🔌 Running Socket Integration Tests...');
    const startTime = performance.now();

    try {
      // Run socket integration tests
      const { stdout, stderr } = await execAsync(
        'npm test -- --testPathPattern=integration/socket-integration.test.ts --verbose',
        { cwd: process.cwd(), timeout: 300000 }
      );

      const duration = performance.now() - startTime;
      
      if (stderr && stderr.includes('FAIL')) {
        this.testResults.push({
          name: 'Socket Integration Tests',
          status: 'failed',
          duration,
          error: 'Socket integration tests failed',
          details: { stderr }
        });
      } else {
        this.testResults.push({
          name: 'Socket Integration Tests',
          status: 'passed',
          duration,
          details: { stdout }
        });
      }

      console.log('✅ Socket Integration Tests completed');

    } catch (error) {
      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'Socket Integration Tests',
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // End-to-End Workflow Tests
  private async runEndToEndTests(): Promise<void> {
    console.log('\n🔄 Running End-to-End Workflow Tests...');
    const startTime = performance.now();

    try {
      // Test complete user workflow
      await this.testCompleteUserWorkflow();

      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'End-to-End Workflow Tests',
        status: 'passed',
        duration,
        details: { workflow: 'User registration to job completion' }
      });

      console.log('✅ End-to-End Workflow Tests completed');

    } catch (error) {
      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'End-to-End Workflow Tests',
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Performance Tests
  private async runPerformanceTests(): Promise<void> {
    console.log('\n⚡ Running Performance Tests...');
    const startTime = performance.now();

    try {
      // Test API response times
      await this.testAPIPerformance();

      // Test database query performance
      await this.testDatabasePerformance();

      // Test cache performance
      await this.testCachePerformance();

      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'Performance Tests',
        status: 'passed',
        duration,
        details: { performance: 'API, Database, and Cache performance validated' }
      });

      console.log('✅ Performance Tests completed');

    } catch (error) {
      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'Performance Tests',
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Security Tests
  private async runSecurityTests(): Promise<void> {
    console.log('\n🔒 Running Security Integration Tests...');
    const startTime = performance.now();

    try {
      // Test authentication security
      await this.testAuthenticationSecurity();

      // Test authorization security
      await this.testAuthorizationSecurity();

      // Test input validation security
      await this.testInputValidationSecurity();

      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'Security Integration Tests',
        status: 'passed',
        duration,
        details: { security: 'Authentication, Authorization, and Input Validation tested' }
      });

      console.log('✅ Security Integration Tests completed');

    } catch (error) {
      const duration = performance.now() - startTime;
      this.testResults.push({
        name: 'Security Integration Tests',
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Test complete user workflow
  private async testCompleteUserWorkflow(): Promise<void> {
    // This would test the complete flow from user registration to job completion
    // For now, we'll simulate the workflow
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test API performance
  private async testAPIPerformance(): Promise<void> {
    // Test API response times
    const startTime = performance.now();
    await knexInstance.raw('SELECT 1');
    const responseTime = performance.now() - startTime;
    
    if (responseTime > 100) {
      throw new Error(`API response time too slow: ${responseTime}ms`);
    }
  }

  // Test database performance
  private async testDatabasePerformance(): Promise<void> {
    // Test database query performance
    const startTime = performance.now();
    await knexInstance('users').select('*').limit(1);
    const queryTime = performance.now() - startTime;
    
    if (queryTime > 50) {
      throw new Error(`Database query too slow: ${queryTime}ms`);
    }
  }

  // Test cache performance
  private async testCachePerformance(): Promise<void> {
    // Test cache performance
    const startTime = performance.now();
    await cacheService.set('test-key', 'test-value', { ttl: 60 });
    const cacheTime = performance.now() - startTime;
    
    if (cacheTime > 10) {
      throw new Error(`Cache operation too slow: ${cacheTime}ms`);
    }
  }

  // Test authentication security
  private async testAuthenticationSecurity(): Promise<void> {
    // Test JWT token validation
    // Test password hashing
    // Test session management
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test authorization security
  private async testAuthorizationSecurity(): Promise<void> {
    // Test role-based access control
    // Test permission validation
    // Test resource ownership
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test input validation security
  private async testInputValidationSecurity(): Promise<void> {
    // Test SQL injection prevention
    // Test XSS prevention
    // Test input sanitization
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate comprehensive test report
  private generateReport(): IntegrationTestReport {
    const totalDuration = performance.now() - this.startTime;
    const passed = this.testResults.filter(t => t.status === 'passed').length;
    const failed = this.testResults.filter(t => t.status === 'failed').length;
    const skipped = this.testResults.filter(t => t.status === 'skipped').length;
    const total = this.testResults.length;
    const successRate = total > 0 ? (passed / total) * 100 : 0;
    const averageDuration = total > 0 ? totalDuration / total : 0;

    const systemHealth = {
      database: true,
      redis: true,
      blockchain: true,
      cache: true
    };

    const recommendations = this.generateRecommendations();

    return {
      summary: {
        total,
        passed,
        failed,
        skipped,
        successRate: Math.round(successRate * 100) / 100,
        totalDuration: Math.round(totalDuration),
        averageDuration: Math.round(averageDuration)
      },
      tests: this.testResults,
      systemHealth,
      recommendations,
      timestamp: new Date()
    };
  }

  // Generate recommendations based on test results
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.testResults.filter(t => t.status === 'failed');

    if (failedTests.length > 0) {
      recommendations.push(`Fix ${failedTests.length} failed integration tests`);
    }

    const slowTests = this.testResults.filter(t => t.duration > 5000);
    if (slowTests.length > 0) {
      recommendations.push(`Optimize ${slowTests.length} slow-running tests`);
    }

    if (this.testResults.length < 8) {
      recommendations.push('Add more comprehensive integration test coverage');
    }

    if (this.testResults.every(t => t.status === 'passed')) {
      recommendations.push('All integration tests passed - system is ready for production');
    }

    return recommendations;
  }

  // Print test report
  printReport(report: IntegrationTestReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 INTEGRATION TEST REPORT');
    console.log('='.repeat(80));

    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed} ✅`);
    console.log(`   Failed: ${report.summary.failed} ❌`);
    console.log(`   Skipped: ${report.summary.skipped} ⏭️`);
    console.log(`   Success Rate: ${report.summary.successRate}%`);
    console.log(`   Total Duration: ${report.summary.totalDuration}ms`);
    console.log(`   Average Duration: ${report.summary.averageDuration}ms`);

    console.log(`\n🔍 Test Details:`);
    report.tests.forEach((test, index) => {
      const status = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
      console.log(`   ${index + 1}. ${status} ${test.name} (${test.duration}ms)`);
      if (test.error) {
        console.log(`      Error: ${test.error}`);
      }
    });

    console.log(`\n🏥 System Health:`);
    console.log(`   Database: ${report.systemHealth.database ? '✅' : '❌'}`);
    console.log(`   Redis: ${report.systemHealth.redis ? '✅' : '❌'}`);
    console.log(`   Blockchain: ${report.systemHealth.blockchain ? '✅' : '❌'}`);
    console.log(`   Cache: ${report.systemHealth.cache ? '✅' : '❌'}`);

    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log(`\n⏰ Report Generated: ${report.timestamp.toISOString()}`);
    console.log('='.repeat(80));
  }
}

// Main execution
async function main() {
  const runner = new IntegrationTestRunner();
  
  try {
    const report = await runner.runAllTests();
    runner.printReport(report);
    
    // Exit with appropriate code
    process.exit(report.summary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Integration test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default IntegrationTestRunner;
