import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sort',
  templateUrl: './sort.component.html',
  styleUrl: './sort.component.scss'
})

export class SortComponent implements OnInit {

  playlists: any[] = [];
  token = '';
  
  constructor(private spotify: SpotifyService, private router: Router) {}

  ngOnInit() {
    const token = sessionStorage.getItem('token');
    if (token) {
      this.token = token;
    }
    this.spotify.getPlaylists(this.token).subscribe((response: any) => {
      this.playlists = response;
      console.log(token);
    });
  }

  selectPlaylist(playlist: any) {
    this.router.navigate(['/playlist', playlist.id]);
  }

}