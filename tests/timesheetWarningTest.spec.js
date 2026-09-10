const { test, expect } = require('@playwright/test');
const { loginPage } = require('../page-objects/loginPage');
const { dashboardPage } = require('../page-objects/dashboardPage');
const { timesheetPage } = require('../page-objects/timesheetPage');

// Load test data
const testData = JSON.parse(JSON.stringify(require('../utils/testDataUtils.json')));

test.describe('KAN-6: Check Timesheet warning messages', () => {
    let loginPageObj;
    let dashboardPageObj;
    let timesheetPageObj;

    test.beforeEach(async ({ page }) => {
        // Initialize Page Objects
        loginPageObj = new loginPage(page);
        dashboardPageObj = new dashboardPage(page);
        timesheetPageObj = new timesheetPage(page);

        // Navigate to login page
        await loginPageObj.goto();
    });

    test('TC-001: Verify My Timesheet navigation, Edit button availability, Edit Timesheet page, Save warning messages, Cancel, and logout', async ({ page }) => {
        // Step 1-2: Login as Admin
        await loginPageObj.validUserLogin(testData.username, testData.password);

        // Step 3: Verify Dashboard loads with Quick Launch widget
        await expect(page).toHaveURL(/.*dashboard/);
        await expect(loginPageObj.DashboardHeading).toBeVisible();
        await expect(dashboardPageObj.myTimesheetButton).toBeVisible();

        // Step 4-5: Click My Timesheet and verify navigation to the Timesheet page
        await dashboardPageObj.clickMyTimesheet();
        await expect(page).toHaveURL(/.*time\/viewMyTimesheet/);

        // Step 6: Verify Edit button is displayed and enabled
        await expect(timesheetPageObj.editButton).toBeVisible();
        await expect(timesheetPageObj.editButton).toBeEnabled();

        // Step 7-8: Click Edit and verify Edit Timesheet page opens
        await timesheetPageObj.clickEdit();
        await expect(page).toHaveURL(/.*time\/editTimesheet/);
        await expect(timesheetPageObj.editTimesheetHeading).toBeVisible();
        await page.waitForLoadState('networkidle');

        // Step 9-10: Enter hours without selecting Project/Activity, then Save
        await timesheetPageObj.enterMondayHours('2');
        await timesheetPageObj.clickSave();

        // Step 11: Verify the warning messages are displayed
        await expect(page).toHaveURL(/.*time\/editTimesheet/);
        await expect(timesheetPageObj.selectProjectWarning).toBeVisible();
        await expect(timesheetPageObj.selectActivityWarning).toBeVisible();

        // Step 12: Click Cancel
        await timesheetPageObj.clickCancel();
        await expect(page).toHaveURL(/.*time\/viewMyTimesheet/);

        // Step 13: Logout
        await dashboardPageObj.logout();

        // Verify redirected to login page
        await expect(page).toHaveURL(/.*auth\/login/);
    });
});
