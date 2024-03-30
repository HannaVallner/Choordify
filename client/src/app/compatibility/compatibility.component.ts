import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../spotify.service';
import { response } from 'express';
@Component({
  selector: 'app-compatibility',
  templateUrl: './compatibility.component.html',
  styleUrl: './compatibility.component.scss'
})
export class CompatibilityComponent implements OnInit {
  playlists: any[] = [];
  trackInfo: any;
  trackId = '';
  hiddenFeatures = ['analysis_url', 'id', 'track_href', 'type', 'uri'];
  
  constructor(private spotify: SpotifyService) {}

  ngOnInit() {
    const token = sessionStorage.getItem('token');
    if (token) {
      this.spotify.getPlaylists(token).subscribe(
        (response: any) => {
          this.playlists = response.items;
        },
      );
      const selectedTrackId = sessionStorage.getItem('trackId');
      if (selectedTrackId) {
        this.trackId = selectedTrackId;
        this.spotify.getTrackFeatures(token, this.trackId).then(trackInfoObservable =>
          {trackInfoObservable.subscribe(trackInfo => {
            this.trackInfo = trackInfo;
            this.filterTrackInfo();
          });
        });
      }
    }
  }

  filterTrackInfo() {
    for (const key in this.trackInfo) {
      if (this.trackInfo.hasOwnProperty(key) && this.hiddenFeatures.includes(key)) {
        delete this.trackInfo[key];
      }
    }
  }


  toggleColour(event: any) {
    event.target.classList.toggle('select')
  }
}
