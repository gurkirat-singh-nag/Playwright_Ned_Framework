/**
 * Test Spec: Leave List - Search for Non-Existent Employee
 * Story ID: KAN-LEAVE-LIST-SEARCH
 * Generation Type: New Functionality (Capability Discovery: NO_REUSE / EXPLORE)
 *
 * Test Case Coverage:
 *   - TC-001: Verify Leave List shows No Records Found for a non-existent employee search
 *
 * Page Objects Used:
 *   - loginPage (page-objects/loginPage.js) - reused, unmodified
 *   - leaveListPage (page-objects/leaveListPage.js) - NEW, created for this story;
 *     no Page Object existed for the Leave List page before this
 *
 * Linked Requirements:
 *   - AC-1: User can navigate to the Leave List page from the sidebar.
 *   - AC-2: User can search leave records by employee name.
 *   - AC-3: Searching for a name that matches no employee shows No Records Found.
 */

const { test, expect } = require('@playwright/test');
const { loginPage } = require('../page-objects/loginPage');
const { leaveListPage } = require('../page-objects/leaveListPage');
const dataset = JSON.parse(JSON.stringify(require('../utils/testDataUtils.json')));

test.describe('KAN-LEAVE-LIST-SEARCH: Leave List Search', () => {

  test('TC-001: Verify Leave List shows No Records Found for a non-existent employee search', async ({ page }) => {
    const login = new loginPage(page);
    const leaveList = new leaveListPage(page);

    // Step 1 (reused: loginPage.goto/validUserLogin)
    await login.goto();
    await login.validUserLogin(dataset.username, dataset.password);

    // Step 2 (NEW: leaveListPage.goto)
    await leaveList.goto();
    await expect(leaveList.leaveHeading).toBeVisible();

    // Step 3 (NEW: leaveListPage.searchByEmployeeName + clickSearch)
    await leaveList.searchByEmployeeName('Zzzznonexistentemployee9999');
    await leaveList.clickSearch();

    // Step 4 (NEW: leaveListPage.isNoRecordsFound)
    const noRecords = await leaveList.isNoRecordsFound();
    expect(noRecords).toBe(true);
  });

});
