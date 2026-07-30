class loginPage{
    constructor(page)
    {
        this.page =page;
        this.Username = page.getByPlaceholder('Username');
        this.Password = page.getByPlaceholder('Password');
        this.Loginbutton = page.getByRole('button', { name: 'Login' });
        this.DashboardHeading = page.getByRole('heading', { name: 'Dashboard' });

    }

    async goto()
    {
       // await this.page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/auth/login")
       await this.page.goto('/')
    }

    async validUserLogin(userName,password)
    {
      await this.Username.type(userName);
      await this.Password.type(password);
      await this.Loginbutton.click();
    }

    async assertUserValidation()
    {
        return this.DashboardHeading;
        
    }
}
module.exports ={loginPage};