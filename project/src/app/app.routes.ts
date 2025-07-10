import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { HomeComponent } from './home/home'; // maker
import { authGuard } from './guards/auth.guard';
import { ParentComponent } from './parent/parent';
import { ChildComponent } from './child/child';
import { SignupComponent } from './signup/signup';

export const routes: Routes = [
 { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] }, // Protect the home route
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }

// { path: '', component: ParentComponent},
// {path: 'parent', component: ParentComponent},
// {path: 'child', component: ChildComponent}
];
