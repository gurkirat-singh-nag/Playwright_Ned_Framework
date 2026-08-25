/**
 * Test Spec: Assign Leave - Insufficient Balance Confirmation
 * Story ID: KAN-ASSIGN-CONFIRM
 * Generation Type: Partial Reuse (Capability Discovery: PARTIAL, 71% coverage)
 *
 * Test Case Coverage:
 *   - TC-001: Verify leave can be assigned to an employee, including confirming
 *             the insufficient-balance dialog
 *
 * Page Objects Used:
 *   - loginPage (page-objects/loginPage.js) - reused, unmodified
 *   - assignLeavePage (page-objects/assignLeavePage.js) - reused; extended with
 *     two new methods (confirmAssignmentIfPrompted, verifyAssignmentSuccess)
 *     discovered missing via live exploration, not present before this story
 *
 * Linked Requirements:
 *   - AC-1: User can navigate to Assign Leave and select an employee, leave type, and dates.
 *   - AC-2: Insufficient-balance confirmation dialog is handled.
 *   - AC-3: Successfully Saved toast confirms the assignment completed.
 */

const { test, expect } = require('@playwright/test');
const { loginPage } = require('../page-objects/loginPage');
const { assignLeavePage } = require('../page-objects/assignLeavePage');
const dataset = JSON.parse(JSON.stringify(require('../utils/testDataUtils.json')));

test.describe('KAN-ASSIGN-CONFIRM: Assign Leave with Insufficient Balance Confirmation', () => {

  test('TC-001: Verify leave can be assigned to an employee, including confirming the insufficient-balance dialog', async ({ page }) => {
    const login = new loginPage(page);
    const assign = new assignLeavePage(page);

    // Step 1 (reused: loginPage.goto/validUserLogin)
    await login.goto();
    await login.validUserLogin(dataset.username, dataset.password);

    // Step 2 (reused: assignLeavePage.navigateToAssignLeave)
    await assign.navigateToAssignLeave();

    // Step 3 (reused: assignLeavePage.searchEmployee + selectFirstEmployeeFromDropdown)
    // Deliberately picks "whichever employee is live right now" rather than a pinned
    // name: this shared public demo instance's employee list is not stable across
    // runs (a name documented in artifacts/kan-1/testcases.json from an earlier
    // session no longer existed when this test was re-verified - found live, not
    // assumed). A pinned name is more brittle here than "first available match".
    await assign.searchEmployee('Test');
    await page.waitForFunction(() => {
      const opts = document.querySelectorAll('[role="option"]');
      return opts.length > 0 && !opts[0].textContent.includes('Searching');
    }, { timeout: 10000 });
    await assign.selectFirstEmployeeFromDropdown();

    // Step 4 (reused: assignLeavePage.selectLeaveType)
    await assign.selectLeaveType('CAN - Vacation');

    // Step 5 (reused: assignLeavePage.setFromDate/setToDate) - next working day,
    // never a hardcoded date; OrangeHRM rejects weekend dates (found live).
    let target = new Date(Date.now() + 86400000);
    while (target.getDay() === 0 || target.getDay() === 6) {
      target = new Date(target.getTime() + 86400000);
    }
    const dateStr = `${target.getFullYear()}-${String(target.getDate()).padStart(2, '0')}-${String(target.getMonth() + 1).padStart(2, '0')}`;
    await assign.setFromDate(dateStr);
    await assign.setToDate(dateStr);

    // Step 6 (reused: assignLeavePage.clickAssign)
    await assign.clickAssign();

    // Step 7 (NEW: assignLeavePage.confirmAssignmentIfPrompted) - handles the
    // insufficient-balance dialog when it appears; no-op otherwise.
    await assign.confirmAssignmentIfPrompted();

    // Step 8 (NEW: assignLeavePage.verifyAssignmentSuccess)
    const succeeded = await assign.verifyAssignmentSuccess();
    expect(succeeded).toBe(true);
  });

});
