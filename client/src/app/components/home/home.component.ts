import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  token = '';
  constructor(private spotify: SpotifyService) {}

  ngOnInit() {
    const storedToken = sessionStorage.getItem("token");
    if (storedToken) {
      this.token = storedToken;
    }
    // initialize user's playlists (with their average features calculated, filtered and normalized)
    this.spotify.getPlaylists(this.token).subscribe((response: any) => {
    });
  }
}
