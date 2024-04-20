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
    this.spotify.getStoredPlaylists().subscribe((response: any) => {
      this.playlists = response;
    });
  }

  toggleColour(event: any) {
    event.target.classList.toggle('select')
  }

  toggleAverages(playlist: any) {
    playlist.displayAverages = !playlist.displayAverages
  }

  toggleTracks(playlist: any) {
    console.log(playlist);
  }
}