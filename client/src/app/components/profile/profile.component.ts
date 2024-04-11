import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';
import { AuthService } from '../../services/auth/auth.service';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})

export class ProfileComponent implements OnInit {
  userInfo: any;
  results = [];
  constructor(private spotify: SpotifyService, private authService: AuthService) {
  }

  ngOnInit() {
    const token = sessionStorage.getItem('token');
    if (token) {
      this.spotify.getUserInfo(token).then(userInfoObservable => {
        userInfoObservable.subscribe((userInfo:any) => {
        this.userInfo = userInfo;
      });
    });
    }
  }

  logout() {
    this.authService.logout();
  }
}
