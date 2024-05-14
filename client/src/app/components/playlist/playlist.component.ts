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
  hover_current = false;
  hover_song = false;
  hover_recommended = false;
  displayedSongs: any;
  loading_more = false;
  keys = ['acousticness', 'danceability', 'energy', 'instrumentalness', 'liveness', 'speechiness', 'valence']; 
  // to iterate over multiple dictionaries simultaneously
  
  constructor(private spotify: SpotifyService) {}

  ngOnInit() {
    const token = sessionStorage.getItem('token');
    if (token) {
      this.token = token;
    }
    // Retrieve the chosen playlist
    this.spotify.getStoredPlaylist(this.token).subscribe((response: any) => {
      this.playlist = response;
      this.displayedSongs = this.playlist.songs.slice(0, 50);
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
    track.adding = true;
    this.spotify.changeTrackPlaylist(this.token, track.best_fit.id, track).subscribe(() => {
      track.adding = false;
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

  // Load more tracks from the playlist
  loadMoreTracks() {
    this.loading_more = true;
    const previousScrollPosition = window.scrollY;
    // If the total loaded amount is equal to currently displayed amount, make a request to Spotify
    if (this.playlist.songs.length == this.displayedSongs.length) {
      this.spotify.loadMoreTracks(this.token).subscribe((response: any) => {
        this.playlist = response;
        this.loading_more = false;
        this.displayedSongs = this.displayedSongs.concat(this.playlist.songs
          .slice(this.displayedSongs.length, this.displayedSongs.length + 50));
        window.scrollTo({ top: previousScrollPosition });
      });
    } else {
        this.displayedSongs = this.displayedSongs.concat(this.playlist.songs
          .slice(this.displayedSongs.length, this.displayedSongs.length + 50));
        window.scrollTo({ top: previousScrollPosition });
    }
  }

}