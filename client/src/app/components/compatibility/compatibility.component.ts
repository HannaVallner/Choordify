import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';

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
  inputField = false;
  hiddenFeatures = ['analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms'];
  
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
    this.spotify.getStoredPlaylists().subscribe((response: any) => {
      this.playlists = response;
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

  toggleColour(event: any) {
    event.target.classList.toggle('select')
  }

  toggleInputField() {
    this.inputField = !this.inputField;
  }


  // Add selected track to selected playlist
  addToPlaylist(playlist: any) {
    this.spotify.addPlaylistTracks(this.token, playlist.id, [this.track.uri]).subscribe(
      (response) => {
        console.log("Tracks added successfully:", response);
      },
      (error) => {
        console.error("Error adding tracks to playlist:", error);
      }
    );
  }

  // Create a new playlist (upon "create" button click)
  createPlaylist() {
    this.spotify.createPlaylist(this.token, this.userId, this.input).subscribe(
      (response) => {
        console.log("Playlist created successfully:", response);
      },
      (error) => {
        console.error("Error creating playlist:", error);
      }
    );
  }
}