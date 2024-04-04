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
  displayFeatures = false;
  
  constructor(private spotify: SpotifyService, private playlistService: PlaylistService, private trackService: TrackService) {}

  ngOnInit() {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      this.token = storedToken;
      this.playlists = this.playlistService.playlists;
      // Get main details and features of selected track
      this.track = this.trackService.track;
        // Calculating selected track's compatibility with each playlist
      this.playlists.forEach(playlist => {
        playlist.compatibility = this.calculateCompatibility(this.track.features, playlist.averages)
    });
    }
  }

  // for chosen track
  toggleFeatures() {
    this.displayFeatures = !this.displayFeatures;
  }

  // for playlist
  toggleAverages(playlist: any) {
    playlist.displayAverages = !playlist.displayAverages
  }
  toggleColour(event: any) {
    event.target.classList.toggle('select')
  }

  // Calculate similarity of a track's and a playlist's features
  calculateCompatibility(trackFeatures: any, playlistAverages: any) {
    let sum = 0; 
    for (const feature of Object.keys(trackFeatures)) {
      sum += Math.pow(trackFeatures[feature] - playlistAverages[feature], 2);
    }
    return Math.round((1 - Math.sqrt(sum / Object.keys(trackFeatures).length)) * 100);
  }
}
