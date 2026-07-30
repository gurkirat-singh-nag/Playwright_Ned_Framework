// @ts-check
const { defineConfig, devices } = require('@playwright/test');




module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  
  retries : 0,
  expect : {
    timeout: 20 * 1000,
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  
 
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html'],['line'],['allure-playwright']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
     baseURL: 'https://opensource-demo.orangehrmlive.com/web/index.php',
     screenshot : 'on',
     video : 'on',
     headless : true,
     
    trace: 'retain-on-failure',
   // storageState:"./auth.json"
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    

 

  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

