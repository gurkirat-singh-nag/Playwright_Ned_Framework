const { test, expect } = require('@playwright/test');
const {loginPage} = require('../page-objects/loginPage');
const {dashboardPage} = require('../page-objects/dashboardPage');
const dataset = JSON.parse(JSON.stringify(require('../utils/testDataUtils.json')));

test.describe.configure('Test Suite',{mode:'serial'});

test.beforeEach(async({page})=>{
  await page.goto('/')
})
test('Client App login', async ({page})=>
{
  const loginpage = new loginPage(page);
  
    //await page.goto('/')
    await loginpage.validUserLogin(dataset.username,dataset.password);
    
    await expect(loginpage.DashboardHeading).toBeVisible()
    await page.context().storageState({path:"auth.json"});
    });

test('Add a candidate', async ({browser})=>
{
 
  const context = await browser.newContext({storageState: "auth.json"})
  const page = await context.newPage();
  //await page.goto('/')
  const dashboardpage = new dashboardPage(page);
  await dashboardpage.clickRecruitment();
  await expect(dashboardpage.RecruitmentPageHeading).toBeVisible()
  await dashboardpage.clickAddbutton();
  await expect(dashboardpage.AddCandidateButton).toBeVisible();
  await dashboardpage.fillUserInfo(dataset.fullname,dataset.lastname);
  await dashboardpage.fillEmailInfo(dataset.email);
  await dashboardpage.selectVacency();
  await dashboardpage.uploadFile(dataset.path);
  await expect(dashboardpage.ConfirmUplod).toHaveText("ResumeTemplate.docx");
  await dashboardpage.selectCheckobox();
  expect(dashboardpage.Checkbox.isChecked()).toBeTruthy();
  await dashboardpage.saveFile();
  await dashboardpage.rejectCandidate();
  await dashboardpage.searchCandidate(dataset.fullname);
   
});

test('PIM Test', async ({browser})=>
{
 
  const context = await browser.newContext({storageState: "auth.json"})
  const page = await context.newPage();
 // await page.goto('/')
  const dashboardpage = new dashboardPage(page);
  await dashboardpage.clickPim();
  expect(dashboardpage.AddeEmployeeHeading).toBeVisible();
  await dashboardpage.fillUserInfo(dataset.fullname,dataset.lastname);
  await dashboardpage.enterEmpid(dataset.empid);
  await dashboardpage.saveFile();
  expect (dashboardpage.Empname).toContainText('Mario James')


});