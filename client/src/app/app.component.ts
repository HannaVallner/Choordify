import { Component, OnInit } from '@angular/core'; 
import { AuthService } from './services/auth/auth.service';
import { Router } from '@angular/router';

@Component({ 
	selector: 'app-root', 
	templateUrl: './app.component.html', 
	styleUrls: ['./app.component.scss'] 
}) 

export class AppComponent implements OnInit { 
	title = 'Choordify'; 
	url = '';

	constructor(private authService: AuthService, private router: Router) {}

	ngOnInit() {
		this.url = window.location.href;
		// Redirect to homepage if user is authenticated
		if (this.url.includes('?')) {
			this.authService.setAuthenticated();
		}
	}

}
