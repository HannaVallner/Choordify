import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';
import { AuthService } from '../../services/auth/auth.service';
import { PlaylistService } from '../../services/playlist/playlist.service';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})

export class ProfileComponent implements OnInit {
  userInfo: any;
  results = [];
  playLists = 0;
  
  constructor(private spotify: SpotifyService, private authService: AuthService) {
  }

  ngOnInit() {
    if (!this.userInfo) {
      const token = sessionStorage.getItem('token');
      if (token) {
        this.userInfo = this.spotify.getUserInfo(token);
      }
    }
  }

  logout() {
    this.authService.logout();
  }
}
