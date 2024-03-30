import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../spotify.service';
import { PlaylistService } from '../playlist.service';

@Component({
  selector: 'app-sort',
  templateUrl: './sort.component.html',
  styleUrl: './sort.component.scss'
})

export class SortComponent implements OnInit {

  playlists: any[] = [];
  token = '';
  
  constructor(private spotify: SpotifyService, private playlistService: PlaylistService) {}

  ngOnInit() {
    const token = sessionStorage.getItem('token');
    if (token) {
      this.token = token;
      this.spotify.getPlaylists(token).subscribe(
        (response: any) => {
          this.playlists = response.items;
          this.playlists.forEach(playlist => {
            this.playlistService.getPlaylistAverages(playlist);
          });
        },
      );
    }
  }

  toggleColour(event: any) {
    event.target.classList.toggle('select')
  }



}
