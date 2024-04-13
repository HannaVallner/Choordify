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
  playLists: any;
  token = '';
  
  constructor(private spotify: SpotifyService, private authService: AuthService, private playListService: PlaylistService) {
  }

  ngOnInit() {
    if (!this.userInfo) {
      const storedToken = sessionStorage.getItem('token');
      if (storedToken != null) {
        this.token = storedToken; 
        this.spotify.getUserInfo(this.token).then(userInfoObservable => {
          userInfoObservable.subscribe(userInfo => {
          this.userInfo = userInfo;
         });
        });
      }
    }
  }

  logout() {
    this.authService.logout();
  }
}
