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
    // Get selected track's features
    //track.features = this.spotify.getTrackFeatures(this.token, this.track.id)
     /**
      (featuresResponse: any) => {
        // Filter out unnecessary features
        this.filterTrackInfo(featuresResponse);
        // Normalize features
        this.track.features = this.normalizeFeatures(featuresResponse);
        
        this.track.features = featuresResponse;
    }); 
     */
    // Initialize displayFeatures as false (changes on button click)
    track.displayFeatures = false;
  }


  // Filter chosen track's features (remove unnecessary ones)
  filterTrackInfo(trackInfo: any) {
    for (const key in trackInfo) {
      if (trackInfo.hasOwnProperty(key) && this.hiddenFeatures.includes(key)) {
        delete trackInfo[key];
      }
    }
  }

  normalizeFeatures(features: any): any {
    const normalizedFeatures: any = {};
    const minMaxValues: any = {
        "acousticness": [0, 1],
        "danceability": [0, 1],
        "energy": [0, 1],
        "instrumentalness": [0, 1],

        //integer
        "key": [-1, 11],

        "liveness": [0, 1],
        "loudness": [-60, 0], 

        //integer
        "mode": [0, 1],

        "speechiness": [0, 1],

        // no real limit
        "tempo": [70, 169], 

        //integer
        "time_signature": [3, 7],

        "valence": [0, 1]
    };
    for (const feature of Object.keys(features)) {
      const value = features[feature];
      const [min, max] = minMaxValues[feature];
      if (value < min) {
        normalizedFeatures[feature] = min;
      } else if (value > max) {
        normalizedFeatures[feature] = max;
      }
      normalizedFeatures[feature] = (value - min) / (max - min);
    }
    return normalizedFeatures;
  }


}
