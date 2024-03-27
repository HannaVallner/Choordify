import { Component, OnInit, Injectable } from '@angular/core'; 
import { Router } from '@angular/router';

@Component({ 
	selector: 'app-root', 
	templateUrl: './app.component.html', 
	styleUrls: ['./app.component.scss'] 
}) 

export class AppComponent implements OnInit { 
	title = 'Choordify'; 
	constructor(private router: Router) {}
	ngOnInit(): void {
		
	}
}
