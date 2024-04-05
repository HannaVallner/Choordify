import { Component, OnInit } from '@angular/core';
import { PlaylistService } from '../../services/playlist/playlist.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  constructor(private playlistService: PlaylistService) {}

  ngOnInit() {
    // If the user's playlists havent been set yet,
    if (this.playlistService.playlists.length == 0) {
    // initialize user's playlists (with their average features calculated, filtered and normalized)
      this.playlistService.togglePlaylists();
    }
  }
}
