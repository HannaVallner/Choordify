import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { startWith, map } from 'rxjs/operators';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrl: './add.component.scss'
})

export class AddComponent {
  searchControl = new FormControl();
  filteredSongs$ = Observable<String[]>;
  constructor() {
    
  }
}
