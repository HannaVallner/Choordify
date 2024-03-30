import { Component, OnInit } from '@angular/core';
import { SpotifyService } from '../spotify.service';

@Component({
  selector: 'app-compatibility',
  templateUrl: './compatibility.component.html',
  styleUrl: './compatibility.component.scss'
})
export class CompatibilityComponent implements OnInit {
  playlists: any[] = [];
  trackInfo: any;
  track: any;
  trackId = '';
  hiddenFeatures = ['analysis_url', 'id', 'track_href', 'type', 'uri'];
  displayFeatures = false;
  
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

        this.spotify.getTrack(token, this.trackId).then(trackObservable => 
          {trackObservable.subscribe(track => {
            this.track = track;
          })})
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

  toggleFeatures() {
    this.displayFeatures = !this.displayFeatures;
  }

  toggleColour(event: any) {
    event.target.classList.toggle('select')
  }
}
