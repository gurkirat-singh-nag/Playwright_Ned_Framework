/**
 * Test Spec: Validation Login Test
 * Story ID: VALIDATION-LOGIN-001
 * Generated: 2026-08-20
 * Generation Type: Express Path (Capability Reuse)
 * 
 * Test Case Coverage:
 *   - TC-001: Verify successful login with valid credentials
 * 
 * Page Objects Used:
 *   - loginPage (page-objects/loginPage.js)
 * 
 * Linked Requirements:
 *   - AC-1: User can navigate to the login page
 *   - AC-2: User can enter username in the username field
 *   - AC-3: User can enter password in the password field
 *   - AC-4: User can click the login button to submit credentials
 *   - AC-5: User is redirected to the dashboard page on successful login
 *   - AC-6: Dashboard heading is visible after successful login
 */

const { test, expect } = require('@playwright/test');
const { loginPage } = require('../page-objects/loginPage');
const dataset = JSON.parse(JSON.stringify(require('../utils/testDataUtils.json')));

test.describe('VALIDATION-LOGIN-001: User Login', () => {

  /**
   * Test Case: TC-001
   * Title: Verify successful login with valid credentials
   * Type: Positive
   * Priority: P1
   * 
   * Preconditions:
   *   - OrangeHRM application is accessible
   *   - Valid test credentials exist (Admin/admin123)
   *   - Browser is launched and session is clean
   * 
   * Expected Result:
   *   User is successfully authenticated and redirected to the dashboard page,
   *   with the "Dashboard" heading visible, confirming successful login.
   */
  test('TC-001: Verify successful login with valid credentials', async ({ page }) => {
    // Initialize Page Object
    const login = new loginPage(page);
    
    // Step 1: Navigate to OrangeHRM login page
    await login.goto();
    
    // Step 2-4: Enter username, password, and click login button
    await login.validUserLogin(dataset.username, dataset.password);
    
    // Step 5-6: Verify redirect to dashboard and dashboard heading is visible
    await expect(login.DashboardHeading).toBeVisible();
  });

});
