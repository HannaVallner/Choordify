import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
    return this.http.get('https://api.spotify.com/v1/me/playlists?limit=50&offset=0', {
      headers: { Authorization: 'Bearer ' + token },
    })
  }

  // Returns a playlist's tracks
  getPlaylistTracks(token: string, playlistId: string, offset: string) {
    return this.http.get('https://api.spotify.com/v1/playlists/' + playlistId + '/tracks?limit=50&offset=' + offset, {
      headers: { Authorization: 'Bearer ' + token },
    })
  }

  // Returns a track
  async getTrack(token: string, trackId: string) {
    return this.http.get('https://api.spotify.com/v1/tracks/' + trackId, {
      headers: { Authorization: 'Bearer ' + token },
    })
  }


  // Returns a track's features
  async getTrackFeatures(token: string, trackId: string) {
    return this.http.get('https://api.spotify.com/v1/audio-features/' + trackId, {
      headers: { Authorization: 'Bearer ' + token },
    })
  }

  // Returns several tracks' features
  getTracksFeatures(token: string, trackIds: string) {
    return this.http.get('https://api.spotify.com/v1/audio-features?' + trackIds, {
      headers: { Authorization: 'Bearer ' + token },
    })
  }

  // Adds tracks to a given playlist
  addPlaylistTracks(token: string, playlistId: string, trackURIs: string) {
    return this.http.post('https://api.spotify.com/v1/playlists/' + playlistId + '/tracks', {
      uris: trackURIs },
      { headers: { Authorization: 'Bearer ' + token },
    })
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

  // Returns tracks which match a given input
  searchForTracks(token: string, input: string) {
    return this.http.get('https://api.spotify.com/v1/search?q=' + input + '&type=track', {
      headers: { Authorization: 'Bearer ' + token },
    })
  }
}
