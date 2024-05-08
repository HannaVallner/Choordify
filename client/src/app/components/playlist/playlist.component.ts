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
  selectedSong: any = null;
  
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

  // Open/close selected song's additional info box
  toggleDropdown(song: any) {
    song.more = !song.more;
    if (song.more) {
      this.selectedSong = song;
      // Close any other song's info box
      this.playlist.songs.forEach((other_song: any) => {
        if (other_song !== song) {
          other_song.more = false;
        }
      });
    } else {
      this.selectedSong = null;
    }
  }
  

  // Change selected song's playlist (remove from current playlist and add to best suited one)
  changeTrackPlaylist(track: any) {
    track.loading = true;
    this.removeFromPlaylist(track);
    this.spotify.changeTrackPlaylist(this.token, track.best_fit.id, track).subscribe(() => {
      track.loading = false;
    });
  }

  // Add selected song to best suited playlist (while keeping it in its original one)
  addToPlaylist(track: any) {
    this.spotify.changeTrackPlaylist(this.token, track.best_fit.id, track).subscribe(() => {

    });
  }

  // Remove selected song from current playlist
  removeFromPlaylist(track: any) {
    if (!track.loading) {
      track.removing = true;
    }
    this.spotify.removePlaylistTracks(this.token, this.playlist.id, track.uri).subscribe((response: any) => {
      this.playlist = response;  
      track.removing = false;
    });
  }

}