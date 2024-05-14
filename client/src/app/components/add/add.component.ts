import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../../services/spotify/spotify.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrl: './add.component.scss'
})

export class AddComponent implements OnInit {
  token = '';
  input = '';
  selectedTrack: any;
  searchResults: any[] = [];
  filteredResults: any[] = [];
  isSelected = false;

  constructor(private spotify: SpotifyService, private router: Router) {
  }

  ngOnInit() {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken != null) {
      this.token = storedToken; 
    }
  }

  onInput(event: any) {
    this.isSelected = false;
    sessionStorage.setItem('trackId', '');
    this.input = event.target.value;
    if(this.input != '') {
      this.toggleSearch();
    } else {
      this.searchResults = [];
    }
  }

  toggleSearch() {
    this.spotify.searchForTracks(this.token, this.input).subscribe(
      (response: any) => {
        this.searchResults = response.tracks.items;
        //this.filterResults();
    });
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
    this.isSelected = true;
    this.selectedTrack = result;
  }

  submitResult() {
    if (this.isSelected && this.selectedTrack) {
      this.router.navigate(['/compatibility', this.selectedTrack.id]);
    }
  }
 
}
