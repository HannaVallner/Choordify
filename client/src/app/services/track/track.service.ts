import { Injectable } from '@angular/core';
import { SpotifyService } from '../spotify/spotify.service';

@Injectable({
  providedIn: 'root'
})
export class TrackService {
  token = '';
  hiddenFeatures = ['analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms'];
  track: any;
  trackId = '';

  constructor(private spotify: SpotifyService) { 
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      this.token = storedToken;
    }
  }

  toggleTrack(track: any) {
    this.track = track;
    // Initialize displayFeatures as false (changes on button click)
    track.displayFeatures = false;
  }

  // Filter chosen track's features (remove unnecessary ones)
  filterTrackInfo(trackInfo : any) {
    for (const key in trackInfo) {
      if (trackInfo.hasOwnProperty(key) && this.hiddenFeatures.includes(key)) {
        delete trackInfo[key];
      }
    }
  }
}
