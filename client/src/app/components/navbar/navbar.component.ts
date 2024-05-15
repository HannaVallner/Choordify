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
  display_name: any = null;
  isDropdown = false;
  constructor(private spotify: SpotifyService, private authService: AuthService) { }

  ngOnInit() {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken != null) {
      this.token = storedToken; 
    }
    this.display_name = sessionStorage.getItem('display_name');
    if (!this.display_name) {
      this.spotify.getUserInfo(this.token).subscribe((response: any) => {
        this.display_name = response.display_name;
        sessionStorage.setItem('display_name', this.display_name);
      });
    }

  }

  logout() {
    this.spotify.logout(this.token);
    this.authService.logout();
  }

  toggleDropdown() {
    this.isDropdown = !this.isDropdown;
  }
}