import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../spotify.service';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})

export class ProfileComponent implements OnInit {
  userInfo: any;
  token = '';
  results = [];
  constructor(private spotify: SpotifyService) {
  }

  ngOnInit() {
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
