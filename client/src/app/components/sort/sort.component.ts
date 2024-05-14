import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';
import { LoadingComponent } from '../loading/loading.component';

@Component({
  selector: 'app-sort',
  templateUrl: './sort.component.html',
  styleUrl: './sort.component.scss'
})

export class SortComponent implements OnInit {

  playlists: any[] = [];
  token = '';
  
  constructor(private spotify: SpotifyService) {}

  ngOnInit() {
    const token = sessionStorage.getItem('token');
    if (token) {
      this.token = token;
    }
    this.spotify.getPlaylists(this.token).subscribe((response: any) => {
      this.playlists = response;
    });
  }


  selectPlaylist(playlist: any) {
    this.spotify.storePlaylist(this.token, playlist).subscribe(() => {});
  }

  deletePlaylist(playlist: any) {

  }

}