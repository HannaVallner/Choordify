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
  playLists: any;
  token = '';
  
  constructor(private spotify: SpotifyService, private authService: AuthService) {
  }

  ngOnInit() {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken != null) {
      this.token = storedToken; 
    }

    this.spotify.getUserInfo(this.token).subscribe((response: any) => {
      this.userInfo = response;
    });
    
    this.spotify.getPlaylists(this.token).subscribe((response: any) => {
      this.playLists = response.length;
    })
  }

  logout() {
    this.spotify.logout(this.token).subscribe((response: any) => {
      console.log(response);
      this.authService.logout();
    })
  }
}
