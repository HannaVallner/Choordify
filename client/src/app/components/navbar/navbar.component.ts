import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})

export class NavbarComponent implements OnInit {
  token = '';
  userInfo: any;
  isDropdown = false;
  constructor(private spotify: SpotifyService, private authService: AuthService) { }

  ngOnInit() {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken != null) {
      this.token = storedToken; 
      this.spotify.getUserInfo(this.token).then(userInfoObservable => {
        userInfoObservable.subscribe((userInfo: any) => {
        this.userInfo = userInfo;
      });
    });
  }
  }

  logout() {
    this.authService.logout();
  }

  toggleDropdown() {
    this.isDropdown = !this.isDropdown;
  }
}
