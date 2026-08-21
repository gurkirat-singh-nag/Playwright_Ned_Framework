/**
 * Page Object for Leave List Page
 * URL: /web/index.php/leave/viewLeaveList
 * Purpose: Search and view leave records
 */
class leaveListPage {
    constructor(page) {
        this.page = page;

        // Page heading (exact: true - "Leave" alone would also match the "Leave List" filter title)
        this.leaveHeading = page.getByRole('heading', { name: 'Leave', exact: true });

        // Search filters
        this.employeeNameField = page.getByPlaceholder('Type for hints...');
        this.fromDateField = page.getByPlaceholder('yyyy-dd-mm').first();
        this.toDateField = page.getByPlaceholder('yyyy-dd-mm').last();

        // Buttons
        this.searchButton = page.getByRole('button', { name: 'Search' });
        this.resetButton = page.getByRole('button', { name: 'Reset' });

        // Results - both the table empty-state and a toast can show this text
        // simultaneously, so scope to the first match rather than either alone.
        this.noRecordsFoundText = page.getByText('No Records Found').first();
        this.tableRows = page.locator('.oxd-table-body > div');
    }

    /**
     * Navigate to Leave List page via the sidebar Leave link
     * Requires: User is logged in
     */
    async goto() {
        await this.page.getByRole('link', { name: 'Leave' }).click();
        await this.page.waitForURL('**/leave/**');
    }

    /**
     * Search for leave records by employee name
     * @param {string} employeeName - Employee name or partial name to search
     */
    async searchByEmployeeName(employeeName) {
        await this.employeeNameField.click();
        await this.employeeNameField.fill(employeeName);
        await this.page.waitForTimeout(1000);
    }

    /**
     * Run the current search filters
     */
    async clickSearch() {
        await this.searchButton.click();
    }

    /**
     * Verify no leave records match the current filters
     * @returns {Promise<boolean>} True if "No Records Found" is displayed
     */
    async isNoRecordsFound() {
        return await this.noRecordsFoundText.isVisible();
    }
}

module.exports = { leaveListPage };
