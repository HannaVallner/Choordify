import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service'; 


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})

export class LoginComponent implements OnInit {
  message: any;

  constructor(private apiService: ApiService) { }; 

	ngOnInit() { 
		this.apiService.getMessage().subscribe(data => { 
			this.message = data; 
		}); 
	} 


}
