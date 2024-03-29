import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../spotify.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})

export class NavbarComponent implements OnInit {
  token = '';
  userInfo: any;
  isDropdown = false;
  constructor(private spotify: SpotifyService) { }

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

  toggleDropdown() {
    this.isDropdown = !this.isDropdown;
  }
}
