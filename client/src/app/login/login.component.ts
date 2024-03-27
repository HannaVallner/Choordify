import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service'; 
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';



@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})

export class LoginComponent implements OnInit {
  message: any;

  constructor(private apiService: ApiService, private router: Router, private http: HttpClient) { }; 

	ngOnInit() { 
		this.apiService.getMessage().subscribe(data => { 
			this.message = data; 
		}); 
	} 


}
