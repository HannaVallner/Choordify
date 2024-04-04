import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})

export class LoginComponent implements OnInit {

  constructor(private authService: AuthService, private router: Router) { }; 

	ngOnInit() { 
    if (this.authService.checkAuthenticated()) {
      this.router.navigate(['/home']);
    }
	} 


}
