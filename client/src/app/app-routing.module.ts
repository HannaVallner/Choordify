import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { ProfileComponent } from './components/profile/profile.component';
import { AddComponent } from './components/add/add.component';
import { SortComponent } from './components/sort/sort.component';
import { AboutComponent } from './components/about/about.component';
import { CompatibilityComponent } from './components/compatibility/compatibility.component';

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'add', component: AddComponent },
  { path: 'sort', component: SortComponent },
  { path: 'about', component: AboutComponent },
  { path: 'compatibility', component: CompatibilityComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
