import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';

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
      this.playlists = response.items;
    });
  }

  toggleColour(event: any) {
    event.target.classList.toggle('select')
  }

  toggleAverages(playlist: any) {
    playlist.displayAverages = !playlist.displayAverages
  }


}