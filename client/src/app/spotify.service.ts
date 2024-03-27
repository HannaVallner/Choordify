import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {

  constructor(private http: HttpClient) { }

  
  async getUserInfo(token: string) {
    return this.http.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: 'Bearer ' + token },
    })
  }

  getPlaylists(token: string) {
    return this.http.get('https://api.spotify.com/v1/me/playlists?limit=50&offset=0', {
      headers: { Authorization: 'Bearer ' + token},
    })
  }
}
