import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private isAuthenticated = false;
  private token = '';
  userInfo: any;
  url = '';
  params = '';
  rawParams = '';

  constructor(private router: Router) { }

  // Confirms the authentication of an user, sets the token in session storage and navigates to home page
  setAuthenticated() {
    this.url = window.location.href;
		this.rawParams = this.url.split('?')[1];
		this.params = this.rawParams.split('#')[0];
		if (this.params == 'authorized=true') {
			this.token = this.url.split('#')[1];
			sessionStorage.setItem('token', this.token);
      this.isAuthenticated = true;
			this.router.navigate(['/home'])
		}
	}
  
  // Returns whether an user is authenticated through a boolean
  checkAuthenticated() {
    const token = sessionStorage.getItem('token');
    if (token != '') {
      return true;
    }
    return false;
  }

  // Logs the user out
  logout() {
    sessionStorage.setItem('token', '');
    this.isAuthenticated = false;
    this.router.navigate([''])
  }
}
