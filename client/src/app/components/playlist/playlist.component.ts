import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';
import { LoadingComponent } from '../loading/loading.component';

@Component({
  selector: 'app-playlist',
  templateUrl: './playlist.component.html',
  styleUrl: './playlist.component.scss'
})

export class PlaylistComponent implements OnInit {

  playlist: any;
  token = '';
  
  constructor(private spotify: SpotifyService) {}

  ngOnInit() {
    const token = sessionStorage.getItem('token');
    if (token) {
      this.token = token;
    }
    // Retrieve the chosen playlist
    this.spotify.getStoredPlaylist().subscribe((response: any) => {
      this.playlist = response;
    });
  }

}