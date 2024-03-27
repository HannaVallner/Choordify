import { NgModule } from '@angular/core'; 
import { BrowserModule } from '@angular/platform-browser'; 
import { AppRoutingModule } from './app-routing.module'; 
import { AppComponent } from './app.component'; 
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { NavbarComponent } from './navbar/navbar.component';
import { ProfileComponent } from './profile/profile.component';
import { AddComponent } from './add/add.component';
import { SortComponent } from './sort/sort.component'; 

@NgModule({ 
	declarations: [ 
		AppComponent, LoginComponent, 
		HomeComponent, NavbarComponent, 
		ProfileComponent, AddComponent, 
		SortComponent 
	], 
	imports: [ 
		BrowserModule, 
		AppRoutingModule, 
		HttpClientModule 
	], 
	providers: [], 
	bootstrap: [AppComponent] 
}) 
export class AppModule { }
