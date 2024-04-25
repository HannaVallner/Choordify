import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class SpotifyService {
  userinfo: any = null;
  playlists: any[] = [];

  constructor(private http: HttpClient) {}

  // Delete previously stored track from server
  deleteStoredTrack() {
    return this.http.delete('http://localhost:3000/api/track/delete', {
    withCredentials: true
    });
  }

  getUserInfo(token: string) {
    if (!this.userinfo) {
      const response = this.http.get('http://localhost:3000/api/user/info', {
        params: { token: token },
        withCredentials: true
      });
      this.userinfo = response;
    }
    return this.userinfo;
  }

  // Returns user's playlists
  getPlaylists(token: string) {
    return this.http.get(`http://localhost:3000/api/playlists/${token}`, {
      withCredentials: true
    });
  }


  // Returns a track from Spotify Web API (with its features, filtered and normalized)
  toggleTrack(token: string, trackId: string) {
    return this.http.get(`http://localhost:3000/api/tracks/${trackId}?token=${token}`, {
      withCredentials: true
    });
  }

  storePlaylist(playlist: any) {
    return this.http.post('http://localhost:3000/api/store_playlist', playlist, {
      withCredentials: true,
      responseType: 'text'
    });
  }

  getStoredPlaylist() {
    return this.http.get('http://localhost:3000/api/stored_playlist', {
      withCredentials: true
    });
  }

  // Returns a track from backend session management
  getStoredTrack() {
    return this.http.get('http://localhost:3000/api/stored_track', {
      withCredentials: true
    });
  }

  // Returns playlists from backend session management
  getStoredPlaylists() {
    return this.http.get('http://localhost:3000/api/stored_playlists', {
      withCredentials: true
    });
  }

  // Returns playlists (with compatibility measures and matching sorting) from backend session management
  getCompPlaylists() {
    return this.http.get('http://localhost:3000/api/comp_playlists', {
      withCredentials: true
    });
  }


  // Adds tracks to a given playlist
  addPlaylistTracks(token: string, playlistId: string, trackURIs: string[]) {
    return this.http.post(`http://localhost:3000/api/playlists/${playlistId}/add-tracks`, 
    { token, trackURIs }, {
      withCredentials: true
    });
  }

  createPlaylist(token: string, userId: string, playlistName: string) {
    return this.http.post('http://localhost:3000/api/playlists/create', 
    { token, userId, playlistName }, {
      withCredentials: true
    });
  }

  // Removes tracks from a given playlist
  // tracks = An array of objects containing Spotify URIs of the tracks or episodes to remove.
  // For example: { "tracks": [{ "uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh" },{ "uri": "spotify:track:1301WleyT98MSxVHPZCA6M" }] }
  removePlaylistTracks(token: string, playlistId: string, trackURIs: object[]) {
    return this.http.delete('https://api.spotify.com/v1/playlists/' + playlistId + '/tracks', {
      headers: { Authorization: 'Bearer ' + token },
      body: { tracks: trackURIs },
      withCredentials: true
    });
  }

  searchForTracks(token: string, query: string) {
    return this.http.get(`http://localhost:3000/api/search/tracks?token=${token}&query=${query}`, {
      withCredentials: true
    });
  }
}