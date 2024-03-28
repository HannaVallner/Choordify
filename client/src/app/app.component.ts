import { Component, OnInit } from '@angular/core'; 
import { AuthService } from './auth.service';
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
		if (this.url.includes('?')) {
			this.authService.setAuthenticated();
		}
		else if (!this.authService.checkAuthenticated()){
			this.router.navigate(['']);
		}
	}

}
