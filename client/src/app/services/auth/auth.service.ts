import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SpotifyService } from '../spotify/spotify.service';

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

  constructor(private router: Router, private spotify: SpotifyService) { }

  
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
  

  checkAuthenticated() {
    return this.isAuthenticated;
  }

  logout() {
    sessionStorage.setItem('token', '');
    this.isAuthenticated = false;
    this.router.navigate([''])
  }
}
