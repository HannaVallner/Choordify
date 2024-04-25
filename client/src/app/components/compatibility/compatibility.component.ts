import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';
import { LoadingComponent } from '../loading/loading.component';

@Component({
  selector: 'app-compatibility',
  templateUrl: './compatibility.component.html',
  styleUrl: './compatibility.component.scss'
})
export class CompatibilityComponent implements OnInit {
  playlists: any[] = [];
  track: any;
  token = '';
  trackId = '';
  input = ''; // For new playlist's name
  result: any;
  userId = '';

  
  constructor(private spotify: SpotifyService) {}

  ngOnInit() {
    const storedToken = sessionStorage.getItem('token');
    const storedId = sessionStorage.getItem("trackId");
    if (storedToken) {
      this.token = storedToken;
    }
    if (storedId) {
      this.trackId = storedId;
    }

    // Get playlists and their average features (normalized and filtered)
    this.spotify.getCompPlaylists().subscribe((response: any) => {
      this.playlists = response;
      this.playlists.forEach(element => {
        console.log(element);
      });
    });
      
    // Get selected track and its features (normalized and filtered)
    this.spotify.getStoredTrack().subscribe((response: any) => {
      this.track = response;
    });

    // Get userID (needed for adding a new playlist)
    this.spotify.getUserInfo(this.token).subscribe((response: any) => {
      this.userId = response.id;
    })
  }

  // for chosen track
  toggleFeatures() {
    this.track.displayFeatures = !this.track.displayFeatures;
  }

  // for playlist
  toggleAverages(playlist: any) {
    playlist.displayAverages = !playlist.displayAverages
  }


  // Add selected track to selected playlist
  addToPlaylist(playlist: any) {
    playlist.loading = true;
    this.spotify.addPlaylistTracks(this.token, playlist.id, [this.track.uri]).subscribe(
        () => {
        // Update the playlists array with the updated playlist data
        this.spotify.getCompPlaylists().subscribe((response: any) => {
          this.playlists = response;
          playlist.loading = false;
        });
      });
  }
  

  // Create a new playlist (upon "create" button click)
  createPlaylist() {
    this.spotify.createPlaylist(this.token, this.userId, this.input).subscribe(
      () => {
        // Update the playlists array with the updated playlist data
        this.spotify.getCompPlaylists().subscribe((response: any) => {
          this.playlists = response;
        });
    });
  }
}