const { test, expect } = require('@playwright/test');
const { loginPage } = require('../page-objects/loginPage');
const { dashboardPage } = require('../page-objects/dashboardPage');

// Load test data
const testData = JSON.parse(JSON.stringify(require('../utils/testDataUtils.json')));

test.describe('KAN-4: check Quick launch options', () => {
    let loginPageObj;
    let dashboardPageObj;

    test.beforeEach(async ({ page }) => {
        // Initialize Page Objects
        loginPageObj = new loginPage(page);
        dashboardPageObj = new dashboardPage(page);

        // Navigate to login page
        await loginPageObj.goto();
    });

    test('TC-001: Verify Quick Launch widget displays all 6 options after Admin login and logout succeeds', async ({ page }) => {
        // Step 1: Login page loads
        await expect(loginPageObj.Username).toBeVisible();
        await expect(loginPageObj.Password).toBeVisible();
        await expect(loginPageObj.Loginbutton).toBeVisible();

        // Step 2: Login as Admin
        await loginPageObj.validUserLogin(testData.username, testData.password);

        // Step 3: Verify Dashboard loads
        await expect(page).toHaveURL(/.*dashboard/);
        await expect(loginPageObj.DashboardHeading).toBeVisible();

        // Step 4-9: Verify all 6 Quick Launch options are visible
        await expect(dashboardPageObj.applyLeaveButton).toBeVisible();
        await expect(dashboardPageObj.leaveListButton).toBeVisible();
        await expect(dashboardPageObj.assignLeaveButton).toBeVisible();
        await expect(dashboardPageObj.myLeaveButton).toBeVisible();
        await expect(dashboardPageObj.myTimesheetButton).toBeVisible();
        await expect(dashboardPageObj.timesheetsButton).toBeVisible();

        // Step 10: Logout
        await dashboardPageObj.logout();

        // Verify redirected to login page
        await expect(page).toHaveURL(/.*auth\/login/);
    });
});
