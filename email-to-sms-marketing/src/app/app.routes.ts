// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { PrivacyPolicyComponent } from './pages/privacy-policy/privacy-policy.component';
import { TermsComponent } from './pages/terms/terms.component';
import { SmsComplianceComponent } from './pages/sms-compliance/sms-compliance.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: 'terms-and-conditions', component: TermsComponent },
  { path: 'sms-compliance', component: SmsComplianceComponent }, 
  // fallback
  { path: '**', redirectTo: '' },
];
