const { test, expect } = require('@playwright/test');
const { loginPage } = require('../page-objects/loginPage');
const { assignLeavePage } = require('../page-objects/assignLeavePage');

test.describe('KAN-1: Apply Leave Feature Test Suite', () => {
    let loginPageObj;
    let assignLeavePageObj;

    test.beforeEach(async ({ page }) => {
        // Initialize Page Objects
        loginPageObj = new loginPage(page);
        assignLeavePageObj = new assignLeavePage(page);

        // Navigate to application
        await loginPageObj.goto();
    });

    test('TC-001: Login to OrangeHRM with valid Admin credentials', async ({ page }) => {
        // Step 1: Navigate to login page (already done in beforeEach)
        await expect(loginPageObj.Username).toBeVisible();
        await expect(loginPageObj.Password).toBeVisible();

        // Step 2-3: Enter credentials
        await loginPageObj.validUserLogin('Admin', 'admin123');

        // Step 4: Verify Dashboard is displayed
        await expect(page).toHaveURL(/.*dashboard/);
        await expect(loginPageObj.DashboardHeading).toBeVisible();
    });

    test('TC-002: Complete leave assignment workflow end-to-end', async ({ page }) => {
        // Step 1: Login
        await loginPageObj.validUserLogin('Admin', 'admin123');
        await expect(page).toHaveURL(/.*dashboard/);

        // Step 2-3: Navigate to Assign Leave
        await assignLeavePageObj.navigateToAssignLeave();
        await expect(assignLeavePageObj.assignLeaveHeading).toBeVisible();

        // Calculate tomorrow's date in yyyy-MM-dd format
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];

        // Step 4-5: Search and select employee
        await assignLeavePageObj.searchEmployee('Test');
        await page.waitForTimeout(2000);
        await assignLeavePageObj.selectEmployeeFromDropdown('TestUser 39');

        // Verify employee selected
        const isSelected = await assignLeavePageObj.isEmployeeSelected('TestUser 39');
        expect(isSelected).toBeTruthy();

        // Step 6: Select leave type (dynamic - select first available option)
        await assignLeavePageObj.leaveTypeDropdown.click();
        // Wait for options to load and select first non-placeholder option
        const firstLeaveTypeOption = page.locator('[role="option"]').filter({ hasText: /^((?!-- Select --).)*$/ }).first();
        await firstLeaveTypeOption.waitFor({ state: 'visible' });
        await firstLeaveTypeOption.click();

        // Step 7-8: Set dates
        await assignLeavePageObj.setFromDate(tomorrowDate);
        await assignLeavePageObj.setToDate(tomorrowDate);

        // Step 9: Add optional comment
        await assignLeavePageObj.enterComments('Leave request for testing - TC-002');

        // Step 10: Submit form
        await assignLeavePageObj.clickAssign();

        // Wait for potential confirmation or redirect (timeout allows for validation errors)
       await page.waitForTimeout(3000);

        // Step 11-12: Logout
        await assignLeavePageObj.logout();
        await expect(page).toHaveURL(/.*login/);
    });

    test('TC-003: Search for employee using Test keyword', async ({ page }) => {
        // Precondition: Login and navigate
        await loginPageObj.validUserLogin('Admin', 'admin123');
        await assignLeavePageObj.navigateToAssignLeave();

        // Step 1: Click in Employee Name field
        await assignLeavePageObj.employeeNameField.click();

        // Step 2-3: Type 'Test' and wait for results
        await assignLeavePageObj.searchEmployee('Test');
        await page.waitForTimeout(2000);

        // Verify autocomplete dropdown displays expected employees
        const dropdown = page.locator('[role="listbox"]');
        await expect(dropdown).toBeVisible();

        // Verify specific employees are in the results
        await expect(page.getByRole('option', { name: 'TestUser 39' })).toBeVisible();
        await expect(page.getByRole('option', { name: /TestUser (69|83|90)/ })).toBeVisible();
    });

    test('TC-004: Attempt to submit Assign Leave without Employee Name', async ({ page }) => {
        // Precondition: Login and navigate
        await loginPageObj.validUserLogin('Admin', 'admin123');
        await assignLeavePageObj.navigateToAssignLeave();

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.setDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];

        // Step 1: Leave Employee Name empty (skip employee selection)

        // Step 2: Select leave type
        await assignLeavePageObj.leaveTypeDropdown.click();
        const firstLeaveTypeOption = page.locator('[role="option"]').filter({ hasText: /^((?!-- Select --).)*$/ }).first();
        await firstLeaveTypeOption.waitFor({ state: 'visible' });
        await firstLeaveTypeOption.click();

        // Step 3-4: Set dates
        await assignLeavePageObj.setFromDate(tomorrowDate);
        await assignLeavePageObj.setToDate(tomorrowDate);

        // Step 5: Click Assign button
        await assignLeavePageObj.clickAssign();

        // Verify validation error appears (form should not submit)
        await page.waitForTimeout(1000);
        // Verify still on Assign Leave page (not redirected)
        await expect(page).toHaveURL(/.*assignLeave/);

        // Check for validation message (exact message may vary)
        const validationMessage = page.locator('text=/Required|Please select/i').first();
        await expect(validationMessage).toBeVisible({ timeout: 5000 });
    });

    test('TC-008: Navigate to Assign Leave page from Dashboard', async ({ page }) => {
        // Precondition: Login to Dashboard
        await loginPageObj.validUserLogin('Admin', 'admin123');
        await expect(page).toHaveURL(/.*dashboard/);

        // Step 1: Verify sidebar is visible
        const leaveSidebarLink = assignLeavePageObj.leaveSidebarLink;
        await expect(leaveSidebarLink).toBeVisible();

        // Step 2: Click Leave in sidebar
        await leaveSidebarLink.click();
        await expect(page).toHaveURL(/.*viewLeaveList/);

        // Step 3: Verify top navigation menu
        const assignLeaveLink = assignLeavePageObj.assignLeaveTopNavLink;
        await expect(assignLeaveLink).toBeVisible();

        // Step 4: Click Assign Leave in top menu
        await assignLeaveLink.click();
        await expect(page).toHaveURL(/.*assignLeave/);

        // Verify all required form fields are visible
        await expect(assignLeavePageObj.assignLeaveHeading).toBeVisible();
        await expect(assignLeavePageObj.employeeNameField).toBeVisible();
        await expect(assignLeavePageObj.leaveTypeDropdown).toBeVisible();
        await expect(assignLeavePageObj.fromDateField).toBeVisible();
        await expect(assignLeavePageObj.toDateField).toBeVisible();
        await expect(assignLeavePageObj.assignButton).toBeVisible();
    });

    test('TC-010: Logout from application', async ({ page }) => {
        // Precondition: Login
        await loginPageObj.validUserLogin('Admin', 'admin123');
        await expect(page).toHaveURL(/.*dashboard/);

        // Step 1: Locate user profile section
        const profileDropdown = assignLeavePageObj.profileDropdownTrigger;
        await expect(profileDropdown).toBeVisible();

        // Step 2: Click profile dropdown
        await profileDropdown.click();
        await page.waitForTimeout(500);

        // Step 3: Click Logout
        const logoutMenuItem = assignLeavePageObj.logoutMenuItem;
        await expect(logoutMenuItem).toBeVisible();
        await logoutMenuItem.click();

        // Verify redirected to login page
        await expect(page).toHaveURL(/.*login/);

        // Verify attempting to navigate to authenticated page redirects to login
        await page.goto('/web/index.php/dashboard/index');
        await expect(page).toHaveURL(/.*login/);
    });
});
