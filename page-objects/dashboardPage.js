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


}
module.exports ={dashboardPage};