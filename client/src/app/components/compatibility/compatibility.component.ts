import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-compatibility',
  templateUrl: './compatibility.component.html',
  styleUrl: './compatibility.component.scss'
})
export class CompatibilityComponent implements OnInit {
  playlists: any[] = [];
  trackId: any = '';
  track: any;
  token = '';
  input = ''; // For new playlist's name
  result: any;
  userId = '';
  creatingPlaylist = false;
  selectedPlaylist: any = null;
  hover_song = false;
  hover_playlist = false;
  keys = ['acousticness', 'danceability', 'energy', 'instrumentalness', 'liveness', 'speechiness', 'valence']; // to iterate over multiple dictionaries simultaneously

  constructor(private spotify: SpotifyService, private route: ActivatedRoute) {}

  ngOnInit() {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      this.token = storedToken;
    }
    this.trackId = this.route.snapshot.paramMap.get('id');
    if (this.trackId != '') {
      // Get selected track and its features (normalized and filtered)
      this.spotify.getTrack(this.token, this.trackId).subscribe((response: any) => {
        this.track = response;
        // Get playlists and their average features (normalized and filtered)
        this.spotify.getCompPlaylists(this.token).subscribe((response: any) => {
          this.playlists = response;
        });
      });
    }

    // Get userID (needed for adding a new playlist)
    this.spotify.getUserInfo(this.token).subscribe((response: any) => {
      this.userId = response.id;
    })
  }

  // Select/unselect playlist's additional info
  selectPlaylist(playlist: any) {
    if (this.selectedPlaylist === playlist) {
      this.selectedPlaylist = null;
    } else {
      this.selectedPlaylist = playlist;
    }
  }

  // Add selected track to selected playlist
  addToPlaylist(playlist: any) {
    playlist.loading = true;
    this.spotify.addPlaylistTracks(this.token, playlist.id, [this.track.uri]).subscribe((response: any) => {
        // Update the playlists array with the updated playlist data
        this.playlists = response;
        playlist.loading = false;
      });
  }

  // Create a new playlist (upon "create" button click)
  createPlaylist() {
    this.creatingPlaylist = true;
    this.spotify.createPlaylist(this.token, this.userId, this.input).subscribe(
      () => {
        // Update the playlists array with the updated playlist data
        this.spotify.getCompPlaylists(this.token).subscribe((response: any) => {
          this.playlists = response;
          this.input = '';
          this.creatingPlaylist = false;
        });
    });
  }
}