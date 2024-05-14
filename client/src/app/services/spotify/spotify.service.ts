import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})

export class SpotifyService {
  userinfo: any = null;
  playlists: any[] = [];

  constructor(private http: HttpClient) {}

  // Delete previously stored track from server
  deleteStoredTrack() {
    return this.http.delete('/api/track/delete', {
    withCredentials: true
    });
  }

  // Get current user's main info
  getUserInfo(token: string) {
    if (!this.userinfo) {
      const response = this.http.get('/api/user/info', {
        params: { token: token },
        withCredentials: true
      });
      this.userinfo = response;
    }
    return this.userinfo;
  }

  
  // Returns user's playlists
  getPlaylists(token: string) {
    return this.http.get(`/api/playlists/${token}`, {
      withCredentials: true
    });
  }

  // TOKEN ADDED
  getCompPlaylists(token: string) {
    return this.http.get(`/api/comp_playlists?token=${token}`, {
      withCredentials: true
    });
  }

  // Returns a track from Spotify Web API (with its features, filtered and normalized)
  toggleTrack(token: string, trackId: string) {
    return this.http.get(`/api/tracks/${trackId}?token=${token}`, {
      withCredentials: true
    });
  }

  // Retrieve the selected playlist 
  getPlaylist(token: string, playlistId: string) {
    return this.http.get(`/api/playlist/${playlistId}?token=${token}`, {
      withCredentials: true
    });
  }


  /*
  // Store the selected playlist in session management
  storePlaylist(token: string, playlist: any) {
    return this.http.post(`/api/store_playlist?token=${token}`, playlist, {
      withCredentials: true,
      responseType: 'text'
    });
  }

  // Returns a track from backend session management
  getStoredTrack(token: string) {
    return this.http.get(`/api/stored_track?token=${token}`, {
      withCredentials: true
    });
  }
*/
  // Adds tracks to a given playlist
  addPlaylistTracks(token: string, playlistId: string, trackURIs: string[]) {
    return this.http.post(`/api/playlists/${playlistId}/add-tracks`, 
    { token, trackURIs }, {
      withCredentials: true
    });
  }

  // Create a new playlist and add the selected track to it
  createPlaylist(token: string, userId: string, playlistName: string) {
    return this.http.post('/api/playlists/create', 
    { token, userId, playlistName }, {
      withCredentials: true
    });
  }

  // Removes tracks from a given playlist
  removePlaylistTracks(token: string, playlistId: string, trackURI: string) {
    return this.http.delete(`/api/playlists/${playlistId}/remove-tracks`, {
      headers: { 'Content-Type': 'application/json' },
      body: { token, trackURI },
      withCredentials: true
  });
  }

  // Add the track that was previously deleted from a playlist to another one
  changeTrackPlaylist(token: string, playlistId: string, track: any) {
    return this.http.post(`/api/playlists/${playlistId}/add-track`, 
    { token, track }, {
      withCredentials: true
    });
  }

  // Search for tracks based on user input (can be artist's or song's name)
  searchForTracks(token: string, query: string) {
    return this.http.get(`/api/search/tracks?token=${token}&query=${query}`, {
      withCredentials: true
    });
  }

  // Send a request to get more of the playlist's songs
  loadMoreTracks(token: string) {
    return this.http.get(`/api/load-more-tracks?token=${token}`, {
      withCredentials: true
    });
  }

  //added
  // Deletes the session's data from the database
  logout(token: string) {
    return this.http.get(`/api/log_out?token=${token}`, {
    });
  }

}