/**
 * Responsive Design Test Script
 * Captures screenshots at various screen sizes to verify responsiveness
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Test credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'siddharthrj4444@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '23313432@Sid';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Screen sizes to test
const SCREEN_SIZES = [
  { name: 'mobile-xs', width: 375, height: 667, device: 'iPhone SE' },
  { name: 'mobile-sm', width: 414, height: 896, device: 'iPhone XR' },
  { name: 'tablet', width: 768, height: 1024, device: 'iPad' },
  { name: 'laptop', width: 1024, height: 768, device: 'Small Laptop' },
  { name: 'desktop', width: 1440, height: 900, device: 'Desktop' },
  { name: 'monitor', width: 1920, height: 1080, device: 'Full HD Monitor' },
  { name: 'qhd', width: 2560, height: 1440, device: 'QHD Monitor' },
  { name: '4k-tv', width: 3840, height: 2160, device: '4K TV' },
];

// Pages to test
const PAGES_TO_TEST = [
  { name: 'login', path: '/login', requiresAuth: false },
  { name: 'register', path: '/register', requiresAuth: false },
  { name: 'dashboard', path: '/dashboard', requiresAuth: true },
  { name: 'cases', path: '/cases', requiresAuth: true },
  { name: 'calendar', path: '/calendar', requiresAuth: true },
];

async function createScreenshotDir() {
  const screenshotDir = path.join(__dirname, 'responsive-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  return screenshotDir;
}

async function login(page) {
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });

  // Wait for form to load
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill in credentials
  await page.type('input[type="email"]', TEST_EMAIL);
  await page.type('input[type="password"]', TEST_PASSWORD);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Login successful!');
    return true;
  } catch (error) {
    console.log('Login may have failed or timed out');
    return false;
  }
}

async function captureScreenshot(page, screenshotDir, pageName, size) {
  const filename = `${pageName}_${size.name}_${size.width}x${size.height}.png`;
  const filepath = path.join(screenshotDir, filename);

  await page.screenshot({
    path: filepath,
    fullPage: false,
  });

  console.log(`  Captured: ${filename}`);
}

async function testPage(browser, screenshotDir, pageConfig, isLoggedIn) {
  console.log(`\nTesting page: ${pageConfig.name}`);

  for (const size of SCREEN_SIZES) {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: size.width,
      height: size.height,
      deviceScaleFactor: 1,
    });

    console.log(`  Testing at ${size.name} (${size.width}x${size.height})`);

    try {
      // Navigate to page
      const url = `${BASE_URL}${pageConfig.path}`;
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Wait a bit for any animations
      await new Promise(r => setTimeout(r, 1000));

      // Capture screenshot
      await captureScreenshot(page, screenshotDir, pageConfig.name, size);
    } catch (error) {
      console.log(`  Error testing ${pageConfig.name} at ${size.name}: ${error.message}`);
    }

    await page.close();
  }
}

async function run() {
  console.log('='.repeat(60));
  console.log('RESPONSIVE DESIGN TEST');
  console.log('='.repeat(60));
  console.log(`Testing URL: ${BASE_URL}`);
  console.log(`Screen sizes: ${SCREEN_SIZES.length}`);
  console.log(`Pages: ${PAGES_TO_TEST.length}`);
  console.log('='.repeat(60));

  const screenshotDir = await createScreenshotDir();
  console.log(`Screenshots will be saved to: ${screenshotDir}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let isLoggedIn = false;
  const pagesToTest = [...PAGES_TO_TEST];
  let caseDetailPath = null;

  try {
    // First, login to get session
    const loginPage = await browser.newPage();
    await loginPage.setViewport({ width: 1280, height: 720 });
    isLoggedIn = await login(loginPage);

    // Store cookies for other pages
    const cookies = await loginPage.cookies();
    await loginPage.close();

    if (isLoggedIn) {
      const casePage = await browser.newPage();
      await casePage.setViewport({ width: 1280, height: 720 });
      await casePage.goto(`${BASE_URL}/cases`, { waitUntil: 'networkidle0', timeout: 30000 });
      caseDetailPath = await casePage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href^="/cases/"]'));
        const detailLink = links.find((link) => {
          const href = link.getAttribute('href') || '';
          return href.startsWith('/cases/') && !href.includes('/cases/create');
        });
        return detailLink ? detailLink.getAttribute('href') : null;
      });
      await casePage.close();

      if (caseDetailPath) {
        pagesToTest.push({ name: 'case-detail', path: caseDetailPath, requiresAuth: true });
      } else {
        console.log('No case detail link found. Skipping case-detail page.');
      }
    }

    // Test each page at each screen size
    for (const pageConfig of pagesToTest) {
      if (pageConfig.requiresAuth && !isLoggedIn) {
        console.log(`Skipping ${pageConfig.name} (requires auth but not logged in)`);
        continue;
      }

      // Create a new context with cookies for authenticated pages
      const page = await browser.newPage();
      if (pageConfig.requiresAuth && cookies.length > 0) {
        await page.setCookie(...cookies);
      }
      await page.close();

      await testPage(browser, screenshotDir, pageConfig, isLoggedIn);
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETED');
    console.log('='.repeat(60));
    console.log(`Total screenshots: ${pagesToTest.length * SCREEN_SIZES.length}`);
    console.log(`Location: ${screenshotDir}`);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
run().catch(console.error);
