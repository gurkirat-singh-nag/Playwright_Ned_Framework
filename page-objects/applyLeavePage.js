/**
 * Page Object for Apply Leave Page
 * URL: /web/index.php/leave/applyLeave
 * Purpose: Apply for personal leave, view leave balance, fill leave request form
 */
class applyLeavePage {
    constructor(page) {
        this.page = page;
        
        // Page heading
        this.applyLeaveHeading = page.getByRole('heading', { name: 'Apply Leave' });
        
        // Form fields
        this.leaveTypeDropdown = page.locator('div').filter({ hasText: /^-- Select --$/ }).first();
        this.leaveBalanceText = page.locator('p').filter({ hasText: /Day\(s\)/ });
        this.fromDateField = page.getByPlaceholder('yyyy-dd-mm').first();
        this.toDateField = page.getByPlaceholder('yyyy-dd-mm').last();
        this.commentsField = page.getByRole('textbox').filter({ hasText: '' }).last();
        
        // Buttons
        this.applyButton = page.getByRole('button', { name: 'Apply' });
        
        // Profile menu elements (available on all authenticated pages)
        this.profilePicture = page.getByRole('img', { name: 'profile picture' });
        this.logoutMenuItem = page.getByRole('menuitem', { name: 'Logout' });
    }

    /**
     * Navigate directly to Apply Leave page (requires authentication)
     */
    async goto() {
        await this.page.goto('/web/index.php/leave/applyLeave');
    }

    /**
     * Get the leave balance text
     * @returns {Promise<string>} Leave balance text (e.g., "0.00 Day(s)")
     */
    async getLeaveBalance() {
        return await this.leaveBalanceText.textContent();
    }

    /**
     * Verify leave balance displays the expected value
     * @param {string} expectedBalance - Expected balance (e.g., "0.00 Day(s)")
     * @returns {Promise<boolean>} True if balance matches expected value
     */
    async verifyLeaveBalance(expectedBalance) {
        const actualBalance = await this.getLeaveBalance();
        return actualBalance.trim() === expectedBalance;
    }

    /**
     * Select leave type from dropdown
     * @param {string} leaveTypeName - Leave type to select
     */
    async selectLeaveType(leaveTypeName) {
        await this.leaveTypeDropdown.click();
        await this.page.getByRole('option', { name: leaveTypeName }).click();
    }

    /**
     * Set From Date
     * @param {string} date - Date in yyyy-dd-mm format
     */
    async setFromDate(date) {
        await this.fromDateField.clear();
        await this.fromDateField.fill(date);
    }

    /**
     * Set To Date
     * @param {string} date - Date in yyyy-dd-mm format
     */
    async setToDate(date) {
        await this.toDateField.clear();
        await this.toDateField.fill(date);
    }

    /**
     * Enter comments
     * @param {string} comments - Optional comments text
     */
    async enterComments(comments) {
        await this.commentsField.fill(comments);
    }

    /**
     * Click Apply button to submit the leave request
     */
    async clickApply() {
        await this.applyButton.click();
    }

    /**
     * Open profile dropdown menu
     */
    async openProfileMenu() {
        await this.profilePicture.click();
    }

    /**
     * Click Logout option from profile menu
     * Requires: Profile menu is already open
     */
    async clickLogout() {
        await this.logoutMenuItem.click();
    }

    /**
     * Complete logout flow: open profile menu and click logout
     */
    async logout() {
        await this.openProfileMenu();
        await this.clickLogout();
    }

    /**
     * Wait for Apply Leave page to be fully loaded
     */
    async waitForPageLoad() {
        await this.applyLeaveHeading.waitFor({ state: 'visible' });
    }
}

module.exports = { applyLeavePage };
