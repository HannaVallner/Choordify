import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../spotify.service';
import { PlaylistService } from '../playlist.service';

@Component({
  selector: 'app-compatibility',
  templateUrl: './compatibility.component.html',
  styleUrl: './compatibility.component.scss'
})
export class CompatibilityComponent implements OnInit {
  playlists: any[] = [];
  trackInfo: any;
  track: any;
  trackId = '';
  token = '';
  hiddenFeatures = ['analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms'];
  displayFeatures = false;
  
  constructor(private spotify: SpotifyService, private playlistService: PlaylistService) {}

  ngOnInit() {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      this.token = storedToken;
      const selectedTrackId = sessionStorage.getItem('trackId');
      if (selectedTrackId) {
        this.trackId = selectedTrackId;
        this.getTrackInfo();
        //this.getTrackInfo();
        //console.log(this.trackInfo);
        // Other info for selected song
        this.playlists = this.playlistService.playlists;
        /** 
        // Calculating selected track's compatibility with each playlist
          this.playlists.forEach(playlist => {
            this.calculateCompatibility(this.trackInfo, playlist);
        });
        */
      }
    }
  }

  async getTrackInfo() {
    // Features for selected song
    //const trackInfo = this.spotify.getTrackFeatures(this.token, this.trackId);
    //this.trackInfo = this.playlistService.normalizeFeatures(trackInfo);
    this.track = await this.spotify.getTrack(this.token, this.trackId);
    console.log(this.track);
    //this.filterTrackInfo();
    /** 
    this.playlists.forEach(playlist => {
      this.calculateCompatibility(this.trackInfo, playlist);
    });
    */
  }

  // Filter chosen track's features (remove unnecessary ones)
  filterTrackInfo() {
    for (const key in this.trackInfo) {
      if (this.trackInfo.hasOwnProperty(key) && this.hiddenFeatures.includes(key)) {
        delete this.trackInfo[key];
      }
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
  calculateCompatibility(trackFeatures: any, playlist: any) {
    const playlistFeatures = playlist.averages;
    console.log('Track Features:', trackFeatures);
    console.log('Playlist Features:', playlistFeatures);
    console.log('danceability playlist: ' + playlistFeatures['danceability']);
    let sum = 0;
    for (const feature of Object.keys(trackFeatures)) {
      sum += Math.pow(trackFeatures[feature] - playlistFeatures[feature], 2);
    }
    playlist.compatibility = Math.round((1 - Math.sqrt(sum / Object.keys(trackFeatures).length)) * 100);
    console.log(playlist.compatibility);
  }
}
