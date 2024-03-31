import { Component, OnInit } from '@angular/core';
import { PlaylistService } from '../playlist.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  constructor(private playlistService: PlaylistService) {}

  ngOnInit() {
    // Initiate necessary playlist operations
    this.playlistService.togglePlaylists();
  }

}
