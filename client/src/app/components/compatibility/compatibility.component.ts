import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';
import { PlaylistService } from '../../services/playlist/playlist.service';
import { TrackService } from '../../services/track/track.service';

@Component({
  selector: 'app-compatibility',
  templateUrl: './compatibility.component.html',
  styleUrl: './compatibility.component.scss'
})
export class CompatibilityComponent implements OnInit {
  playlists: any[] = [];
  track: any;
  token = '';
  hiddenFeatures = ['analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms'];
  
  constructor(private spotify: SpotifyService, private playlistService: PlaylistService, private trackService: TrackService) {}

  ngOnInit() {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      this.token = storedToken;
      this.playlists = this.playlistService.playlists;
      // Get main details and features of selected track
      this.track = this.trackService.track;
        // Calculating selected track's compatibility with each playlist
     // this.playlists.forEach(playlist => {
      //  playlist.compatibility = this.calculateCompatibility(this.track.features, playlist.averages)
    //});
    }
  }

  // for chosen track
  toggleFeatures() {
    this.spotify.getTrackFeatures(this.token, this.track.id).subscribe((response: any) => {
      this.track.features = response.items;
    /** 
      this.playlists.forEach(playlist => {
        // calculate playlists' averages (filtered and normalized)
        this.getPlaylistAverages(playlist);
        });
        */
    });
    this.track.displayFeatures = !this.track.displayFeatures;
  }

  // for playlist
  toggleAverages(playlist: any) {
    playlist.displayAverages = !playlist.displayAverages
  }
  toggleColour(event: any) {
    event.target.classList.toggle('select')
  }

  getCompatibility(track: any, playlist: any) {
  
  }

  // Calculate similarity of a track's and a playlist's features
  calculateCompatibility(trackFeatures: any, playlistAverages: any) {
    let sum = 0; 
    for (const feature of Object.keys(trackFeatures)) {
      sum += Math.pow(trackFeatures[feature] - playlistAverages[feature], 2);
    }
    return Math.round((1 - Math.sqrt(sum / Object.keys(trackFeatures).length)) * 100);
  }

  addToPlaylist(playlist: any) {
    this.spotify.addPlaylistTracks(this.token, playlist.id, [this.track.uri]);
  }
}
