const { test, expect } = require('@playwright/test');
const { loginPage } = require('../page-objects/loginPage');
const { dashboardPage } = require('../page-objects/dashboardPage');
const { applyLeavePage } = require('../page-objects/applyLeavePage');

// Load test data
const testData = JSON.parse(JSON.stringify(require('../utils/testDataUtils.json')));

test.describe('KAN-2: Apply Leave - Verify Default Leave Balance', () => {
    let loginPageObj;
    let dashboardPageObj;
    let applyLeavePageObj;

    test.beforeEach(async ({ page }) => {
        // Initialize Page Objects
        loginPageObj = new loginPage(page);
        dashboardPageObj = new dashboardPage(page);
        applyLeavePageObj = new applyLeavePage(page);

        // Navigate to login page
        await loginPageObj.goto();
    });

    test('TC-001: Complete Apply Leave Flow with Valid Credentials', async ({ page }) => {
        // Step 1-2: Login page loads
        await expect(loginPageObj.Username).toBeVisible();
        await expect(loginPageObj.Password).toBeVisible();
        await expect(loginPageObj.Loginbutton).toBeVisible();

        // Step 2-4: Enter credentials and login
        await loginPageObj.validUserLogin(testData.username, testData.password);

        // Verify dashboard loads
        await expect(page).toHaveURL(/.*dashboard/);
        await expect(loginPageObj.DashboardHeading).toBeVisible();

        // Step 5-6: Locate Quick Launch and click Apply Leave
        await expect(dashboardPageObj.applyLeaveButton).toBeVisible();
        await dashboardPageObj.clickApplyLeave();

        // Verify Apply Leave page loads
        await expect(page).toHaveURL(/.*leave\/applyLeave/);
        await applyLeavePageObj.waitForPageLoad();

        // Step 7: Verify Leave Balance displays "0.00 Day(s)"
        await expect(applyLeavePageObj.leaveBalanceText).toBeVisible();
        const leaveBalance = await applyLeavePageObj.getLeaveBalance();
        expect(leaveBalance.trim()).toBe('0.00 Day(s)');

        // Step 8-9: Logout via profile menu
        await applyLeavePageObj.openProfileMenu();
        await expect(applyLeavePageObj.logoutMenuItem).toBeVisible();
        await applyLeavePageObj.clickLogout();

        // Verify redirected to login page
        await expect(page).toHaveURL(/.*auth\/login/);
    });

    test('TC-002: Login with Valid Admin Credentials', async ({ page }) => {
        // Step 1: Login page loads
        await expect(loginPageObj.Username).toBeVisible();
        await expect(loginPageObj.Password).toBeVisible();

        // Step 2-4: Enter credentials and login
        await loginPageObj.validUserLogin(testData.username, testData.password);

        // Verify authentication success
        await expect(page).toHaveURL(/.*dashboard/);
        await expect(loginPageObj.DashboardHeading).toBeVisible();

        // Verify Quick Launch widget is visible
        await expect(dashboardPageObj.applyLeaveButton).toBeVisible();
    });

    test('TC-003: Navigate to Apply Leave via Quick Launch', async ({ page }) => {
        // Prerequisite: Login first
        await loginPageObj.validUserLogin(testData.username, testData.password);
        await expect(page).toHaveURL(/.*dashboard/);

        // Step 1-2: Locate Quick Launch and click Apply Leave
        await expect(dashboardPageObj.applyLeaveButton).toBeVisible();
        await dashboardPageObj.clickApplyLeave();

        // Step 2: Verify navigation to Apply Leave page
        await expect(page).toHaveURL(/.*leave\/applyLeave/);
        await applyLeavePageObj.waitForPageLoad();

        // Step 3-4: Verify Leave Balance field and value
        await expect(applyLeavePageObj.leaveBalanceText).toBeVisible();
        const leaveBalance = await applyLeavePageObj.getLeaveBalance();
        expect(leaveBalance.trim()).toBe('0.00 Day(s)');

        // Verify form is ready for input
        await expect(applyLeavePageObj.leaveTypeDropdown).toBeVisible();
        await expect(applyLeavePageObj.fromDateField).toBeVisible();
        await expect(applyLeavePageObj.toDateField).toBeVisible();
    });

    test('TC-004: Logout from Profile Menu', async ({ page }) => {
        // Prerequisite: Login first to reach authenticated state
        await loginPageObj.validUserLogin(testData.username, testData.password);
        await expect(page).toHaveURL(/.*dashboard/);

        // Step 1-3: Locate profile picture and logout
        await expect(dashboardPageObj.profilePicture).toBeVisible();
        await dashboardPageObj.openProfileMenu();
        await expect(dashboardPageObj.logoutMenuItem).toBeVisible();
        await dashboardPageObj.clickLogout();

        // Step 4: Verify logout success
        await expect(page).toHaveURL(/.*auth\/login/);
        await expect(loginPageObj.Username).toBeVisible();

        // Verify cannot access protected pages after logout
        await page.goto('/web/index.php/dashboard/index');
        await expect(page).toHaveURL(/.*auth\/login/);
    });

    test('TC-005: Login with Invalid Username', async ({ page }) => {
        // Step 1: Login page loads
        await expect(loginPageObj.Username).toBeVisible();

        // Step 2-4: Enter invalid credentials
        await loginPageObj.validUserLogin('InvalidUser', testData.password);

        // Verify login fails
        await expect(page).not.toHaveURL(/.*dashboard/);
        
        // Verify user remains on login page
        await expect(page).toHaveURL(/.*auth\/login/);
    });

    test('TC-006: Login with Invalid Password', async ({ page }) => {
        // Step 1: Login page loads
        await expect(loginPageObj.Username).toBeVisible();

        // Step 2-4: Enter invalid password
        await loginPageObj.validUserLogin(testData.username, 'wrongpassword');

        // Verify login fails
        await expect(page).not.toHaveURL(/.*dashboard/);
        
        // Verify user remains on login page
        await expect(page).toHaveURL(/.*auth\/login/);
    });

    test('TC-007: Login with Empty Credentials', async ({ page }) => {
        // Step 1: Login page loads
        await expect(loginPageObj.Username).toBeVisible();

        // Step 2-3: Click login without entering credentials
        await loginPageObj.Loginbutton.click();

        // Verify form validation prevents submission
        await expect(page).toHaveURL(/.*auth\/login/);
        await expect(page).not.toHaveURL(/.*dashboard/);
    });

    test('TC-008: Access Apply Leave without Authentication', async ({ page }) => {
        // Step 1: Navigate directly to Apply Leave URL without authentication
        await page.goto('/web/index.php/leave/applyLeave');

        // Verify redirection to login page (authorization enforcement)
        await expect(page).toHaveURL(/.*auth\/login/);
        await expect(loginPageObj.Username).toBeVisible();
    });

    test('TC-009: Leave Balance Display Format Validation', async ({ page }) => {
        // Prerequisite: Login and navigate to Apply Leave
        await loginPageObj.validUserLogin(testData.username, testData.password);
        await expect(page).toHaveURL(/.*dashboard/);
        
        await dashboardPageObj.clickApplyLeave();
        await expect(page).toHaveURL(/.*leave\/applyLeave/);

        // Step 2-3: Verify exact format of Leave Balance
        await expect(applyLeavePageObj.leaveBalanceText).toBeVisible();
        const leaveBalance = await applyLeavePageObj.getLeaveBalance();
        
        // Verify exact format: "0.00 Day(s)"
        expect(leaveBalance.trim()).toBe('0.00 Day(s)');
        
        // Verify two decimal places
        expect(leaveBalance).toMatch(/\d+\.\d{2}\s+Day\(s\)/);
    });

    test('TC-010: Profile Menu Availability Across Pages', async ({ page }) => {
        // Step 1-3: Verify profile menu on Dashboard
        await loginPageObj.validUserLogin(testData.username, testData.password);
        await expect(page).toHaveURL(/.*dashboard/);
        
        await expect(dashboardPageObj.profilePicture).toBeVisible();
        await dashboardPageObj.openProfileMenu();
        await expect(dashboardPageObj.logoutMenuItem).toBeVisible();
        
        // Close dropdown (click elsewhere)
        await page.keyboard.press('Escape');

        // Step 4-6: Navigate to Apply Leave and verify profile menu
        await dashboardPageObj.clickApplyLeave();
        await expect(page).toHaveURL(/.*leave\/applyLeave/);
        
        await expect(applyLeavePageObj.profilePicture).toBeVisible();
        await applyLeavePageObj.openProfileMenu();
        await expect(applyLeavePageObj.logoutMenuItem).toBeVisible();
        
        // Close dropdown
        await page.keyboard.press('Escape');

        // Step 7: Verify profile menu on another page (Leave module)
        await page.getByRole('link', { name: 'Leave' }).click();
        await expect(page).toHaveURL(/.*leave\/viewLeaveModule/);
        
        // Profile menu should still be visible
        await expect(page.getByRole('img', { name: 'profile picture' })).toBeVisible();
    });
});
