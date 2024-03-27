import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SpotifyService } from '../spotify.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit{
  message: any
  userInfo: any;
  token = '';
  username = '';
  displayName = '';


  constructor(private spotify: SpotifyService, private router: Router) {}

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
