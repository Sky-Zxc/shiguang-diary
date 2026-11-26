import { defineConfig } from '@playwright/test';
const baseURL=process.env.DIARY_BASE_URL??'http://127.0.0.1:5173';
export default defineConfig({
  testDir:'./tests/e2e', timeout:45000, fullyParallel:false, workers:1,
  use:{baseURL,viewport:{width:1440,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
  webServer:{command:baseURL.endsWith(':4173')?'npm run preview':'npm run dev',url:baseURL,reuseExistingServer:true,timeout:30000},
});
