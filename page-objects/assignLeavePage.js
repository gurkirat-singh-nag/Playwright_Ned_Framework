class assignLeavePage {
    constructor(page) {
        this.page = page;
        
        // Navigation elements
        this.leaveSidebarLink = page.getByRole('link', { name: 'Leave' });
        this.assignLeaveTopNavLink = page.getByRole('link', { name: 'Assign Leave' });
        
        // Form heading
        this.assignLeaveHeading = page.getByRole('heading', { name: 'Assign Leave' });
        
        // Form fields
        this.employeeNameField = page.getByRole('textbox', { name: 'Type for hints...' });
        this.leaveTypeDropdown = page.locator('div').filter({ hasText: /^-- Select --$/ }).nth(2);
        this.leaveBalanceText = page.locator('text=0.00 Day(s)').first();
        this.fromDateField = page.getByPlaceholder('yyyy-dd-mm').first();
        this.toDateField = page.getByPlaceholder('yyyy-dd-mm').last();
        this.commentsField = page.getByLabel('Comments');
        
        // Date picker icons
        this.fromDateCalendarIcon = page.locator('i.oxd-icon.bi-calendar').first();
        this.toDateCalendarIcon = page.locator('i.oxd-icon.bi-calendar').last();
        
        // Buttons
        this.assignButton = page.getByRole('button', { name: 'Assign' });
        
        // Logout elements
        this.profileDropdownTrigger = page.locator('span').filter({ hasText: 'admin okegu last Name' });
        this.logoutMenuItem = page.getByRole('menuitem', { name: 'Logout' });
    }

    /**
     * Navigate to Assign Leave page from Dashboard
     * Requires: User is logged in and on Dashboard
     */
    async navigateToAssignLeave() {
        await this.leaveSidebarLink.click();
        await this.page.waitForURL('**/leave/viewLeaveList');
        await this.assignLeaveTopNavLink.click();
        await this.page.waitForURL('**/leave/assignLeave');
    }

    /**
     * Search for employee by typing search term
     * @param {string} searchTerm - Employee name or partial name to search
     */
    async searchEmployee(searchTerm) {
        await this.employeeNameField.click();
        await this.employeeNameField.fill(searchTerm);
        // Wait for autocomplete dropdown to appear
        await this.page.waitForTimeout(1000);
    }

    /**
     * Select employee from autocomplete dropdown
     * @param {string} employeeName - Full employee name to select (e.g., "TestUser 39")
     */
    async selectEmployeeFromDropdown(employeeName) {
        await this.page.getByRole('option', { name: employeeName }).click();
        // Wait for dropdown to close
        await this.page.waitForTimeout(500);
    }

    /**
 * Select the first employee from autocomplete dropdown
 */
async selectFirstEmployeeFromDropdown() {
    // Select the first option from the dropdown list
    await this.page.getByRole('option').first().click();
    // Wait for dropdown to close
    await this.page.waitForTimeout(500);
}

    /**
     * Select leave type from dropdown
     * @param {string} leaveTypeName - Leave type to select (e.g., "CAN - Fad", "US - Vacation")
     */
    async selectLeaveType(leaveTypeName) {
        await this.leaveTypeDropdown.click();
        await this.page.getByRole('option', { name: leaveTypeName }).click();
    }

    /**
     * Set From Date using date picker
     * @param {string} date - Date in format matching yyyy-dd-mm placeholder
     */
    async setFromDate(date) {
        await this.fromDateField.clear();
        await this.fromDateField.fill(date);
    }

    /**
     * Set To Date using date picker
     * @param {string} date - Date in format matching yyyy-dd-mm placeholder
     */
    async setToDate(date) {
        await this.toDateField.clear();
        await this.toDateField.fill(date);
    }

    /**
     * Enter optional comments
     * @param {string} comments - Comments text
     */
    async enterComments(comments) {
        await this.commentsField.fill(comments);
    }

    /**
     * Click Assign button to submit form
     */
    async clickAssign() {
        await this.assignButton.click();
    }

    /**
     * Fill complete Assign Leave form and submit
     * @param {Object} leaveData - Leave assignment data
     * @param {string} leaveData.employeeSearchTerm - Search term for employee (e.g., "Test")
     * @param {string} leaveData.employeeName - Full employee name to select (e.g., "TestUser 39")
     * @param {string} leaveData.leaveType - Leave type name
     * @param {string} leaveData.fromDate - From date
     * @param {string} leaveData.toDate - To date
     * @param {string} [leaveData.comments] - Optional comments
     */
    async assignLeave(leaveData) {
        await this.searchEmployee(leaveData.employeeSearchTerm);
        await this.selectEmployeeFromDropdown(leaveData.employeeName);
        await this.selectLeaveType(leaveData.leaveType);
        await this.setFromDate(leaveData.fromDate);
        await this.setToDate(leaveData.toDate);
        
        if (leaveData.comments) {
            await this.enterComments(leaveData.comments);
        }
        
        await this.clickAssign();
    }

    /**
     * Logout from application
     */
    async logout() {
        await this.profileDropdownTrigger.click();
        await this.logoutMenuItem.click();
        await this.page.waitForURL('**/auth/login');
    }

    /**
     * Verify Assign Leave page is displayed
     * @returns {Promise<boolean>} True if page heading is visible
     */
    async isAssignLeavePageDisplayed() {
        return await this.assignLeaveHeading.isVisible();
    }

    /**
     * Get Leave Balance text for assertion
     * @returns {Promise<string>} Leave balance text (e.g., "0.00 Day(s)")
     */
    async getLeaveBalanceText() {
        return await this.leaveBalanceText.textContent();
    }

    /**
     * Verify employee name field is populated with selected employee
     * @param {string} expectedName - Expected employee name
     * @returns {Promise<boolean>} True if field value matches expected name
     */
    async isEmployeeSelected(expectedName) {
        const actualValue = await this.employeeNameField.inputValue();
        return actualValue.includes(expectedName);
    }
}

module.exports = { assignLeavePage };
