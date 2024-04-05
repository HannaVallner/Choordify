import { Injectable } from '@angular/core';
import { SpotifyService } from '../spotify/spotify.service';

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  token = '';
  hiddenFeatures = ['analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms'];
  playlists: any[] = [];

  constructor(private spotify: SpotifyService) { 
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      this.token = storedToken;
    }
  }

  togglePlaylists() {
    // get playlists
    this.spotify.getPlaylists(this.token).subscribe((response: any) => {
      this.playlists = response.items;
      this.playlists.forEach(playlist => {
        // calculate playlists' averages (filtered and normalized)
        //this.getPlaylistAverages(playlist);
      });
    });
  }

  getPlaylistAverages(playlist: any) {
    // Get all track's on the playlist
    this.spotify.getPlaylistTracks(this.token, playlist.id, '0').subscribe(
      (response: any) => {
        // Join the tracks' id's to receive their features in a bundle
        const tracks = response.items.map((item: any) => item.track.id);
        const trackIds = tracks.join(',');
        this.spotify.getTracksFeatures(this.token, trackIds).subscribe(
        (featuresResponse: any) => {
          // Filter out unnecessary features
          const featuresArray = this.filterFeatures(featuresResponse.audio_features);
          // Calculate the average of the playlist's each feature
          const playlistAverages = this.calculatePlaylistAverages(featuresArray);
          // Normalize averages
          const normalizedAverages = this.normalizeFeatures(playlistAverages)
          playlist.averages = normalizedAverages;
          // Initialize displayAverages variable as false (changes on button click)
          playlist.displayAverages = false;
        })
      }
    );
  }

  // Returns several tracks' features with specified features removed
  filterFeatures(trackFeatures: any[]) {
    const filteredTracks: any[] = [];
    for (const track of trackFeatures) {
      const filteredTrack: any = {};
      Object.keys(track).forEach(key => {
        if (!this.hiddenFeatures.includes(key)) {
          filteredTrack[key] = track[key];
        }
      });
      filteredTracks.push(filteredTrack);
    }
    return filteredTracks;
  }

  calculatePlaylistAverages(featuresArray: any) {
    const averageFeatures: any = {};
    const totalTracks = featuresArray.length;
    for (const track of featuresArray) {
      for (const key of Object.keys(track)) {
        if (!averageFeatures[key]) {
          averageFeatures[key] = 0;
        }
        averageFeatures[key] += track[key];
      }
    }
    for (const key of Object.keys(averageFeatures)) {
      averageFeatures[key] /= totalTracks;
    }
    return averageFeatures;
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
