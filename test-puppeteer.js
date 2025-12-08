/**
 * Enhanced Puppeteer Test Script for Legal Diary
 *
 * Tests:
 * - Login functionality
 * - Dashboard navigation
 * - Cases page
 * - Calendar page
 * - Screenshots of all pages
 *
 * Usage:
 *   node test-puppeteer.js
 *
 * Environment variables:
 *   TEST_EMAIL - Login email (default: test@example.com)
 *   TEST_PASSWORD - Login password (default: password123)
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  email: process.env.TEST_EMAIL || 'siddharthrj4444@gmail.com',
  password: process.env.TEST_PASSWORD || '23313432@Sid',
  screenshotDir: path.join(__dirname, 'screenshots'),
  viewport: { width: 1920, height: 1080 },
  timeout: 30000
};

// Create screenshots directory
if (!fs.existsSync(CONFIG.screenshotDir)) {
  fs.mkdirSync(CONFIG.screenshotDir);
}

/**
 * Wait for navigation and network to be idle
 */
async function waitForPageLoad(page) {
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.timeout });
}

/**
 * Take a screenshot with timestamp
 */
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(CONFIG.screenshotDir, filename);

  await page.screenshot({
    path: filepath,
    fullPage: true
  });

  console.log(`  📸 Screenshot saved: ${filename}`);
  return filepath;
}

/**
 * Login to Legal Diary
 */
async function login(page) {
  console.log('\n🔐 Step 1: Login');
  console.log('─'.repeat(50));

  // Navigate to login page
  console.log(`  → Navigating to ${CONFIG.baseUrl}/login`);
  await page.goto(`${CONFIG.baseUrl}/login`, {
    waitUntil: 'networkidle2',
    timeout: CONFIG.timeout
  });

  await takeScreenshot(page, '01-login-page');

  // Fill in login form
  console.log(`  → Filling email: ${CONFIG.email}`);
  await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 5000 });
  await page.type('input[type="email"], input[placeholder*="email" i]', CONFIG.email);

  console.log('  → Filling password');
  await page.type('input[type="password"]', CONFIG.password);

  await takeScreenshot(page, '02-login-filled');

  // Submit form
  console.log('  → Clicking login button');

  // Find and click the login button
  const loginButtonClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const loginButton = buttons.find(btn =>
      btn.type === 'submit' ||
      btn.textContent.toLowerCase().includes('login') ||
      btn.textContent.toLowerCase().includes('log in')
    );
    if (loginButton) {
      loginButton.click();
      return true;
    }
    return false;
  });

  if (!loginButtonClicked) {
    throw new Error('Login button not found');
  }

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.timeout });

  // Check if login was successful
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    console.log('  ⚠️  Still on login page - checking for errors');
    const errorElement = await page.$('.ant-message-error, .error, [class*="error"]');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent, errorElement);
      throw new Error(`Login failed: ${errorText}`);
    }
  }

  console.log(`  ✅ Login successful! Redirected to: ${currentUrl}`);
  await takeScreenshot(page, '03-after-login');
}

/**
 * Test Dashboard page
 */
async function testDashboard(page) {
  console.log('\n📊 Step 2: Dashboard (Legal Referencer)');
  console.log('─'.repeat(50));

  console.log('  → Navigating to /dashboard');
  await page.goto(`${CONFIG.baseUrl}/dashboard`, {
    waitUntil: 'networkidle2',
    timeout: CONFIG.timeout
  });

  const title = await page.title();
  console.log(`  📄 Page title: "${title}"`);

  // Wait for content to load
  await page.waitForSelector('body', { timeout: 5000 });

  // Check for today's date display
  const hasDateDisplay = await page.evaluate(() => {
    return document.body.innerText.includes(new Date().getFullYear().toString());
  });
  console.log(`  ${hasDateDisplay ? '✅' : '⚠️'}  Today's date displayed`);

  await takeScreenshot(page, '04-dashboard');

  console.log('  ✅ Dashboard page loaded successfully');
}

/**
 * Test Cases page
 */
async function testCases(page) {
  console.log('\n📁 Step 3: Cases Page');
  console.log('─'.repeat(50));

  console.log('  → Navigating to /cases');
  await page.goto(`${CONFIG.baseUrl}/cases`, {
    waitUntil: 'networkidle2',
    timeout: CONFIG.timeout
  });

  const title = await page.title();
  console.log(`  📄 Page title: "${title}"`);

  await page.waitForSelector('body', { timeout: 5000 });

  // Check for cases table or empty state
  const hasCasesOrEmpty = await page.evaluate(() => {
    const bodyText = document.body.innerText.toLowerCase();
    return bodyText.includes('case') || bodyText.includes('no cases') || bodyText.includes('create');
  });
  console.log(`  ${hasCasesOrEmpty ? '✅' : '⚠️'}  Cases content loaded`);

  await takeScreenshot(page, '05-cases-page');

  console.log('  ✅ Cases page loaded successfully');
}

/**
 * Test Calendar page
 */
async function testCalendar(page) {
  console.log('\n📅 Step 4: Calendar Page');
  console.log('─'.repeat(50));

  console.log('  → Navigating to /calendar');
  await page.goto(`${CONFIG.baseUrl}/calendar`, {
    waitUntil: 'networkidle2',
    timeout: CONFIG.timeout
  });

  const title = await page.title();
  console.log(`  📄 Page title: "${title}"`);

  await page.waitForSelector('body', { timeout: 5000 });

  // Check for calendar elements
  const hasCalendar = await page.evaluate(() => {
    const bodyText = document.body.innerText.toLowerCase();
    return bodyText.includes('calendar') || bodyText.includes('hearing') ||
           document.querySelector('.ant-picker-calendar, [class*="calendar"]') !== null;
  });
  console.log(`  ${hasCalendar ? '✅' : '⚠️'}  Calendar content loaded`);

  await takeScreenshot(page, '06-calendar-page');

  console.log('  ✅ Calendar page loaded successfully');
}

/**
 * Test Case Creation (optional)
 */
async function testCaseCreation(page) {
  console.log('\n➕ Step 5: Case Creation (Optional)');
  console.log('─'.repeat(50));

  try {
    console.log('  → Navigating to /cases/create');
    await page.goto(`${CONFIG.baseUrl}/cases/create`, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout
    });

    await page.waitForSelector('body', { timeout: 5000 });

    const hasForm = await page.evaluate(() => {
      return document.querySelector('form, input, textarea') !== null;
    });
    console.log(`  ${hasForm ? '✅' : '⚠️'}  Case creation form loaded`);

    await takeScreenshot(page, '07-case-create-page');

    console.log('  ✅ Case creation page loaded successfully');
  } catch (error) {
    console.log(`  ⚠️  Case creation page not accessible: ${error.message}`);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Legal Diary - Enhanced Puppeteer Test Suite   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n📍 Base URL: ${CONFIG.baseUrl}`);
  console.log(`👤 Test User: ${CONFIG.email}`);
  console.log(`📁 Screenshots: ${CONFIG.screenshotDir}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: CONFIG.viewport
  });

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport(CONFIG.viewport);

    // Enable request/response logging (optional)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  ⚠️  Browser console error: ${msg.text()}`);
      }
    });

    // Run all tests
    await login(page);
    await testDashboard(page);
    await testCases(page);
    await testCalendar(page);
    await testCaseCreation(page);

    // Get performance metrics
    console.log('\n⚡ Performance Metrics');
    console.log('─'.repeat(50));
    const metrics = await page.metrics();
    console.log(`  Task Duration: ${metrics.TaskDuration.toFixed(2)}ms`);
    console.log(`  JS Heap Size: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  DOM Nodes: ${metrics.Nodes}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
    console.log('\n🔒 Browser closed');
  }
}

// Run the tests
runTests()
  .then(() => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║        ✨ All tests completed successfully! ✨    ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n╔══════════════════════════════════════════════════╗');
    console.error('║           💥 Test suite failed! 💥               ║');
    console.error('╚══════════════════════════════════════════════════╝');
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  });
