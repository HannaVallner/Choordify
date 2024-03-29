import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../spotify.service';

@Component({
  selector: 'app-sort',
  templateUrl: './sort.component.html',
  styleUrl: './sort.component.scss'
})

export class SortComponent implements OnInit {

  playlists: any[] = [];
  
  constructor(private spotify: SpotifyService) {}

  ngOnInit() {
    const token = sessionStorage.getItem('token');
    if (token) {
      this.spotify.getPlaylists(token).subscribe(
        (response: any) => {
          this.playlists = response.items;
        },
      );
    }
  }

}
