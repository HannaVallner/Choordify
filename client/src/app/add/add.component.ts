import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../spotify.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrl: './add.component.scss'
})

export class AddComponent implements OnInit {
  token = '';
  input = '';
  searchResults: any[] = [];
  filteredResults: any[] = [];

  constructor(private spotify: SpotifyService) {
  }

  ngOnInit() {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken != null) {
      this.token = storedToken; 
    }
  }

  submitSearch() {
    if (this.input != '') {
      this.spotify.searchForTracks(this.token, this.input).subscribe(
        (response: any) => {
          this.searchResults = response.tracks.items;
          this.filterResults();
        },
      );
    }
  }
  
  filterResults() {
    this.searchResults = this.searchResults.filter((track: any, index: number, self: any[]) => {
      return index === self.findIndex((t: any) => (
        t.artists[0].name === track.artists[0].name && t.name === track.name
      ));
    });
  }

  selectResult(result: any) {
    this.input = result.artists[0].name + ' - ' + result.name;
    this.searchResults = [];
  }

  
}
