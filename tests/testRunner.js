// tests/testRunner.js
// Headless Automated Test Runner for Iron Tactics 14th-Century Grand Strategy Game
// Zero external npm dependencies. Pure Node.js built-in runtime.

import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI Colors for formatted terminal output
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

// Global Test Registry and Runner
export class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.totalSkipped = 0;
    this.startTime = 0;
    this.endTime = 0;
    this.failures = [];
  }

  describe(suiteName, fn) {
    const suite = {
      name: suiteName,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  test(testName, fn, options = {}) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {
        this.test(testName, fn, options);
      });
      return;
    }

    this.currentSuite.tests.push({
      name: testName,
      fn,
      skip: options.skip || false,
      tier: options.tier || 1
    });
  }

  async run() {
    console.log(`\n${COLORS.bold}${COLORS.cyan}======================================================================${COLORS.reset}`);
    console.log(`${COLORS.bold}${COLORS.cyan}     IRON TACTICS: 14th-CENTURY SUB-CONTINENT TEST RUNNER             ${COLORS.reset}`);
    console.log(`${COLORS.bold}${COLORS.cyan}     Zero-Dependency Headless Dual-Track E2E Test Suite                ${COLORS.reset}`);
    console.log(`${COLORS.bold}${COLORS.cyan}======================================================================${COLORS.reset}\n`);

    this.startTime = performance.now();

    for (const suite of this.suites) {
      console.log(`\n${COLORS.bold}${COLORS.magenta}▶ SUITE: ${suite.name}${COLORS.reset}`);
      const suiteStart = performance.now();

      for (const t of suite.tests) {
        if (t.skip) {
          suite.skipped++;
          this.totalSkipped++;
          console.log(`  ${COLORS.yellow}⚠ SKIP${COLORS.reset} ${COLORS.dim}[Tier ${t.tier}]${COLORS.reset} ${t.name}`);
          continue;
        }

        const testStart = performance.now();
        try {
          // Supports both synchronous and async test functions
          await t.fn();
          const testElapsed = (performance.now() - testStart).toFixed(2);
          suite.passed++;
          this.totalPassed++;
          console.log(`  ${COLORS.green}✔ PASS${COLORS.reset} ${COLORS.dim}[Tier ${t.tier} | ${testElapsed}ms]${COLORS.reset} ${t.name}`);
        } catch (err) {
          const testElapsed = (performance.now() - testStart).toFixed(2);
          suite.failed++;
          this.totalFailed++;
          this.failures.push({
            suite: suite.name,
            test: t.name,
            tier: t.tier,
            error: err
          });
          console.log(`  ${COLORS.red}✖ FAIL${COLORS.reset} ${COLORS.dim}[Tier ${t.tier} | ${testElapsed}ms]${COLORS.reset} ${COLORS.bold}${t.name}${COLORS.reset}`);
          console.log(`    ${COLORS.red}${err.message}${COLORS.reset}`);
          if (err.actual !== undefined && err.expected !== undefined) {
            console.log(`      ${COLORS.dim}Actual:   ${JSON.stringify(err.actual)}${COLORS.reset}`);
            console.log(`      ${COLORS.dim}Expected: ${JSON.stringify(err.expected)}${COLORS.reset}`);
          }
        }
      }

      suite.duration = performance.now() - suiteStart;
    }

    this.endTime = performance.now();
    const totalDuration = (this.endTime - this.startTime).toFixed(2);

    this.printSummary(totalDuration);

    if (this.totalFailed > 0) {
      process.exitCode = 1;
    } else {
      process.exitCode = 0;
    }

    return {
      passed: this.totalPassed,
      failed: this.totalFailed,
      skipped: this.totalSkipped,
      total: this.totalPassed + this.totalFailed + this.totalSkipped,
      duration: totalDuration
    };
  }

  printSummary(totalDuration) {
    console.log(`\n${COLORS.bold}${COLORS.cyan}----------------------------------------------------------------------${COLORS.reset}`);
    console.log(`${COLORS.bold}EXECUTION SUMMARY:${COLORS.reset}`);
    console.log(`  Total Test Cases: ${this.totalPassed + this.totalFailed + this.totalSkipped}`);
    console.log(`  ${COLORS.green}Passed:           ${this.totalPassed}${COLORS.reset}`);
    console.log(`  ${COLORS.red}Failed:           ${this.totalFailed}${COLORS.reset}`);
    console.log(`  ${COLORS.yellow}Skipped:          ${this.totalSkipped}${COLORS.reset}`);
    console.log(`  Total Duration:   ${totalDuration} ms`);
    console.log(`${COLORS.bold}${COLORS.cyan}----------------------------------------------------------------------${COLORS.reset}`);

    if (this.failures.length > 0) {
      console.log(`\n${COLORS.bold}${COLORS.red}FAILURES REPORT (${this.failures.length}):${COLORS.reset}`);
      this.failures.forEach((f, idx) => {
        console.log(`\n  ${idx + 1}) [${f.suite}] -> [Tier ${f.tier}] ${f.test}`);
        console.log(`     ${COLORS.red}${f.error.stack || f.error.message}${COLORS.reset}`);
      });
      console.log(`\n${COLORS.bgRed}${COLORS.white}${COLORS.bold} RESULT: FAILED with ${this.totalFailed} errors ${COLORS.reset}\n`);
    } else {
      console.log(`\n${COLORS.bgGreen}${COLORS.white}${COLORS.bold} RESULT: ALL TESTS PASSED SUCCESSFULLY (100%) ${COLORS.reset}\n`);
    }
  }
}

// Singleton runner instance
export const runner = new TestRunner();

// Exported DSL helpers
export const describe = (name, fn) => runner.describe(name, fn);
export const test = (name, fn, options) => runner.test(name, fn, options);

// Assertion Library
export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new AssertionError(message, false, true);
  }
}

export function assertTrue(val, message = 'Expected true') {
  if (val !== true) {
    throw new AssertionError(`${message}: expected true, got ${val}`, val, true);
  }
}

export function assertFalse(val, message = 'Expected false') {
  if (val !== false) {
    throw new AssertionError(`${message}: expected false, got ${val}`, val, false);
  }
}

export function assertEqual(actual, expected, message = 'Values not strictly equal') {
  if (actual !== expected) {
    if (actual instanceof Number && actual.valueOf() === expected) {
      return;
    }
    if (expected instanceof Number && expected.valueOf() === actual) {
      return;
    }
    throw new AssertionError(`${message}: ${actual} !== ${expected}`, actual, expected);
  }
}

export function assertNotEqual(actual, unexpected, message = 'Values unexpectedly equal') {
  if (actual === unexpected) {
    throw new AssertionError(`${message}: ${actual} === ${unexpected}`, actual, `not ${unexpected}`);
  }
}

export function assertApproxEqual(actual, expected, tolerance = 0.001, message = 'Value outside tolerance') {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new AssertionError(
      `${message}: ${actual} not within ±${tolerance} of ${expected} (diff=${diff})`,
      actual,
      expected
    );
  }
}

export function assertInBounds(val, min, max, message = 'Value out of bounds') {
  if (val < min || val > max) {
    throw new AssertionError(
      `${message}: value ${val} not in range [${min}, ${max}]`,
      val,
      `[${min}, ${max}]`
    );
  }
}

export function assertDeepEqual(actual, expected, message = 'Objects not deeply equal') {
  const isObject = (obj) => obj !== null && typeof obj === 'object';

  function compare(a, b, path = '') {
    if (a === b) return true;

    if (!isObject(a) || !isObject(b)) {
      throw new AssertionError(`${message} at ${path || 'root'}: ${a} !== ${b}`, a, b);
    }

    if (Array.isArray(a) !== Array.isArray(b)) {
      throw new AssertionError(`${message} at ${path || 'root'}: Array mismatch`, a, b);
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      throw new AssertionError(
        `${message} at ${path || 'root'}: Key count mismatch (${keysA.length} vs ${keysB.length})`,
        keysA,
        keysB
      );
    }

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) {
        throw new AssertionError(`${message} at ${path ? path + '.' + key : key}: Missing key in expected`, undefined, key);
      }
      compare(a[key], b[key], path ? `${path}.${key}` : key);
    }
    return true;
  }

  compare(actual, expected);
}

export function assertThrows(fn, expectedErrorSubstring = null, message = 'Expected function to throw') {
  let threw = false;
  let thrownError = null;
  try {
    fn();
  } catch (err) {
    threw = true;
    thrownError = err;
  }

  if (!threw) {
    throw new AssertionError(message, 'No error thrown', 'Expected error');
  }

  if (expectedErrorSubstring && !thrownError.message.includes(expectedErrorSubstring)) {
    throw new AssertionError(
      `${message}: Error message "${thrownError.message}" does not include expected "${expectedErrorSubstring}"`,
      thrownError.message,
      expectedErrorSubstring
    );
  }
}

// CLI Execution Entry Point
// If this file is run directly via `node tests/testRunner.js`
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  (async () => {
    try {
      // Import all modular test suites
      await import('./test_data_models.js');
      await import('./test_character_stats.js');
      await import('./test_turn_engine.js');
      await import('./test_combat_math.js');
      await import('./test_diplomacy_ai.js');
      await import('./test_serialization.js');
      await import('./test_e2e_suite.js');
      await import('./test_autoresolve_integration.js');
      await import('./test_tactical_engine.js');
      await import('./test_ai_turn.js');
      await import('./test_public_order_and_tech.js');

      await runner.run();
    } catch (err) {
      console.error(`${COLORS.red}Fatal test runner failure: ${err.message}${COLORS.reset}`);
      console.error(err.stack);
      process.exit(1);
    }
  })();
}
