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
  playlist_loading = false;
  
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

  toggleDropdown(song: any) {
    song.more = !song.more;

    this.playlist.songs.forEach((track: any) => {
      if (track !== song) {
        track.more = false;
      }
    });
  }
  
  changeTrackPlaylist(track: any) {
    this.removeFromPlaylist(track);
    this.spotify.changeTrackPlaylist(this.token, track.best_fit.id, track).subscribe((response: any) =>
      {});
  }

  removeFromPlaylist(track: any) {
    this.playlist_loading = true;
    this.spotify.removePlaylistTracks(this.token, this.playlist.id, track.uri).subscribe((response: any) => {
      this.playlist = response;  
      this.playlist_loading = false;
    });
  }

}