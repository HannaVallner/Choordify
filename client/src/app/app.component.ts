import { Component, OnInit } from '@angular/core'; 
import { Router } from '@angular/router';

@Component({ 
	selector: 'app-root', 
	templateUrl: './app.component.html', 
	styleUrls: ['./app.component.scss'] 
}) 

export class AppComponent implements OnInit { 
	title = 'Choordify'; 
	url = '';
	rawParams = '';
	params = '';
	token = '';

	constructor(private router: Router) {}

	ngOnInit() {
		this.url = window.location.href;
		if (this.url.includes('?')) {
			this.setAuthorized();
		}
	}

	setAuthorized() {
		this.rawParams = this.url.split('?')[1];
		this.params = this.rawParams.split('#')[0];
		if (this.params == 'authorized=true') {
			this.token = this.url.split('#')[1];
			sessionStorage.setItem('token', this.token);
			this.router.navigate(['/home'])
		}
	}

}
