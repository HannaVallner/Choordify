import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class SpotifyService {

  constructor(private http: HttpClient) { }

  // Returns user's info  
  async getUserInfo(token: string) {
    return this.http.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: 'Bearer ' + token },
    })
  }

  // Returns user's playlists
  getPlaylists(token: string) {
    return this.http.get(`http://localhost:3000/api/playlists/${token}`, {
      withCredentials: true
    });
  }

  // Returns a playlist's tracks
  getPlaylistTracks(token: string, playlistId: string, offset: string) {
    return this.http.get(`http://localhost:3000/api/playlists/${playlistId}/tracks?token=${token}&offset=${offset}`);
  }

  // Returns a track from backend
  getTrack(token: string, trackId: string) {
    return this.http.get(`http://localhost:3000/api/tracks/${trackId}?token=${token}`);
  }


  // Returns a track's features
  getTrackFeatures(token: string, trackId: string) {
    return this.http.get(`http://localhost:3000/api/audio-features/${trackId}?token=${token}`);
  }

  // Returns several tracks' features
  getTracksFeatures(token: string, trackIds: string) {
    return this.http.get(`http://localhost:3000/api/tracks/features?token=${token}&trackIds=${trackIds}`);
  }

  // Adds tracks to a given playlist
  addPlaylistTracks(token: string, playlistId: string, trackURIs: string[]) {
    return this.http.post('https://api.spotify.com/v1/playlists/' + playlistId + '/tracks', 
    { uris: trackURIs }, 
    { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } 
    })
      .subscribe(
        (response) => {
          console.log("Tracks added successfully:", response);
        },
        (error) => {
          console.error("Error adding tracks to playlist:", error);
        }
      );
  }

  // Removes tracks from a given playlist
  // tracks = An array of objects containing Spotify URIs of the tracks or episodes to remove.
  // For example: { "tracks": [{ "uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh" },{ "uri": "spotify:track:1301WleyT98MSxVHPZCA6M" }] }
  removePlaylistTracks(token: string, playlistId: string, trackURIs: object[]) {
    return this.http.delete('https://api.spotify.com/v1/playlists/' + playlistId + '/tracks', {
      headers: { Authorization: 'Bearer ' + token },
      body: { tracks: trackURIs }
    });
  }

  // Creates a new playlist
  createPlaylist(token: string, userId: string, playlistName: string) {
    return this.http.post('https://api.spotify.com/v1/users/' + userId +'/playlists', {
      headers: { Authorization: 'Bearer ' + token }, 
      body: { name: playlistName}
    });
  }

  searchForTracks(token: string, query: string) {
    return this.http.get(`http://localhost:3000/api/search/tracks?token=${token}&query=${query}`);
  }
}