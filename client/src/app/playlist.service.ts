import { Injectable } from '@angular/core';
import { SpotifyService } from './spotify.service';

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  token = '';
  hiddenFeatures = ['analysis_url', 'id', 'track_href', 'type', 'uri'];

  constructor(private spotify: SpotifyService) { 
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      this.token = storedToken;
    }
  }

  // s
  getPlaylistAverages(playlist: any) {
    this.spotify.getPlaylistTracks(this.token, playlist.id, '0').subscribe(
      (response: any) => {
        const tracks = response.items.map((item: any) => item.track.id);
        const trackIds = tracks.join(',');
        this.spotify.getTracksFeatures(this.token, trackIds).subscribe(
        (featuresResponse: any) => {
          const featuresArray = this.filterFeatures(featuresResponse.audio_features);
          const playlistAverages = this.calculatePlaylistAverages(featuresArray);
          playlist.averages = playlistAverages;
        }
        )
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

}
