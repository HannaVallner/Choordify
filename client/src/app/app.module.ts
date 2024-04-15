import { NgModule } from '@angular/core'; 
import { BrowserModule } from '@angular/platform-browser'; 
import { AppRoutingModule } from './app-routing.module'; 
import { AppComponent } from './app.component'; 
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ProfileComponent } from './components/profile/profile.component';
import { AddComponent } from './components/add/add.component';
import { SortComponent } from './components/sort/sort.component';
import { AboutComponent } from './components/about/about.component';
import { CompatibilityComponent } from './components/compatibility/compatibility.component';
import { LoadingComponent } from './components/loading/loading.component';
@NgModule({ 
	declarations: [ 
		AppComponent, LoginComponent, 
		HomeComponent, NavbarComponent, 
		ProfileComponent, AddComponent, 
		SortComponent, AboutComponent, 
		CompatibilityComponent, LoadingComponent 
	], 
	imports: [ 
		BrowserModule, 
		AppRoutingModule, 
		HttpClientModule,
		FormsModule,
	], 
	providers: [], 
	bootstrap: [AppComponent] 
}) 
export class AppModule { }
