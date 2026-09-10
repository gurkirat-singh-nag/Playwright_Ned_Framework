/**
 * Page Object for My Timesheet / Edit Timesheet pages
 * URLs: /web/index.php/time/viewMyTimesheet, /web/index.php/time/editTimesheet/{id}
 * Purpose: Verify the Edit button on the My Timesheet page and the resulting Edit Timesheet page
 */
class timesheetPage {
    constructor(page) {
        this.page = page;

        // My Timesheet page
        this.editButton = page.getByRole('button', { name: 'Edit' });

        // Edit Timesheet page
        this.editTimesheetHeading = page.getByRole('heading', { name: 'Edit Timesheet' });
        this.cancelButton = page.getByRole('button', { name: 'Cancel' });
        this.saveButton = page.getByRole('button', { name: 'Save' });
        this.mondayHoursInput = page.getByRole('row').nth(1).getByRole('textbox').nth(1);
        this.selectProjectWarning = page.getByText('Select a Project');
        this.selectActivityWarning = page.getByText('Select an Activity');
    }

    /**
     * Click the Edit button on the My Timesheet page
     */
    async clickEdit() {
        await this.editButton.click();
    }

    /**
     * Click the Cancel button on the Edit Timesheet page
     */
    async clickCancel() {
        await this.cancelButton.click();
    }

    /**
     * Enter an hours value in the Monday column of the first timesheet row
     */
    async enterMondayHours(hours) {
        await this.mondayHoursInput.fill(hours);
    }

    /**
     * Click the Save button on the Edit Timesheet page
     */
    async clickSave() {
        await this.saveButton.click();
    }
}
module.exports = { timesheetPage };
