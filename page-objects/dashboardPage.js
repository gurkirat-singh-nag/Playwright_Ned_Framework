class dashboardPage{
    constructor(page)
    {
        this.page =page;
        this.HeaderText = page.getByPlaceholder('Username');
        this.RecruitmentLink = page.getByRole('link', { name: 'Recruitment' });
        this.AddButton = page.getByRole('button', { name: ' Add' });
        this.FullName = page.getByPlaceholder('First Name');
        this.LastName = page.getByPlaceholder('Last Name');
        this.Email = page.getByPlaceholder('Type here');
        this.VacencyBox= page.locator('.oxd-select-text.oxd-select-text--active');
        this.Option = page.getByRole('option', { name: 'Associate IT Manager' });
        this.Browse = page.getByText('Browse');
        this.UploadButton = page.locator('input[type="file"]');
        this.SaveButton = page.getByRole('button', { name: 'Save' });
        this.RejectButton = page.getByRole('button', { name: 'Reject' });
        this.Checkbox = page.locator('form span i');
        this.RecruitmentPageHeading = page.getByRole('heading', { name: 'Recruitment' });
        this.AddCandidateButton = page.getByRole('heading', { name: 'Add Candidate' });
        this.ConfirmUplod = page.locator('//div[@class="oxd-file-input-div"]');
        this.Close = page.locator('form span i');
        this.CandidateBtn = page.getByRole('link', { name: 'Candidates' });
        this.UserSearchbox = page.getByPlaceholder('Type for hints...');
        this.SearchButton = page.getByRole('button', { name: 'Search' });
        this.PIM = page.getByRole('link', { name: 'PIM' });
        this.AddeEmployeeHeading = page.getByRole('heading', { name: 'Add Employee' });
        this.Empid = page.locator('(//input[@class="oxd-input oxd-input--active"])');
        this.Empname = page.locator('.orangehrm-edit-employee-name');
        
        // Quick Launch widget elements (KAN-2)
        this.applyLeaveButton = page.getByRole('button', { name: 'Apply Leave' });
        this.assignLeaveButton = page.getByRole('button', { name: 'Assign Leave' });
        this.leaveListButton = page.getByRole('button', { name: 'Leave List' });
        this.timesheetsButton = page.getByRole('button', { name: 'Timesheets' });
        this.myLeaveButton = page.getByRole('button', { name: 'My Leave' });
        this.myTimesheetButton = page.getByRole('button', { name: 'My Timesheet' });
        
        // Profile menu elements (KAN-2)
        this.profilePicture = page.getByRole('img', { name: 'profile picture' });
        this.logoutMenuItem = page.getByRole('menuitem', { name: 'Logout' });
        


    }

    async clickRecruitment()
    {
       await this.RecruitmentLink.click();
      
    }

    async clickAddbutton()
    {
       await this.AddButton.click();
       
    }

    async fillUserInfo(fname,lname)
    {
       await this.FullName.type(fname);
       await this.LastName.type(lname);
       
    }

    async fillEmailInfo(email)
    {
        this.Email.first().fill(email);
    }
    async selectVacency()
    {
       await this.VacencyBox.click();
       await this.Option.click();
    }
    async uploadFile(file)
    {
        await this.Browse.click();
        await this.UploadButton.setInputFiles(file)
        
        

    }

    async selectCheckobox()
    {
      await this.Close.click();
      await this.Checkbox.click();
      
    }
    async saveFile()
    {
       
        await this.SaveButton.click();
      
    }
    async rejectCandidate()
    {
        await this.RejectButton.click();
        
      
    }
    async searchCandidate(uname)
    {
        await this.CandidateBtn.click();
        await this.UserSearchbox.type(uname);
        await this.SearchButton.click();
      
    }

    async clickPim()
    {
       await this.PIM.click();
       await this.AddButton.click();
      
    }
    async enterEmpid(empid)
    {
       // await this.page.waitForSelector(this.Empid)
       await this.Empid.last().type(empid)
      
      
    }

    // Quick Launch methods (KAN-2)
    /**
     * Click Apply Leave button in Quick Launch widget
     */
    async clickApplyLeave() {
        await this.applyLeaveButton.click();
    }

    /**
     * Click Assign Leave button in Quick Launch widget
     */
    async clickAssignLeave() {
        await this.assignLeaveButton.click();
    }

    /**
     * Open profile dropdown menu
     */
    async openProfileMenu() {
        await this.profilePicture.click();
    }

    /**
     * Click Logout from profile menu
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


}
module.exports ={dashboardPage};