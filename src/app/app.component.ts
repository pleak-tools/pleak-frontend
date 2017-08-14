import { Component, OnInit } from '@angular/core';
import { RouteService } from "app/route/route.service";
import { AuthService } from "app/auth/auth.service";
import { UserService } from "app/user/user.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit{

  constructor(private authService: AuthService, private routeService: RouteService, private userService: UserService) {
    this.authService.authStatus.subscribe(status => {
      this.authenticated = status;
    });
    this.routeService.routePage.subscribe(page => {
      this.page = page;
    });
  }
  
  page;
  private subpage;
  private authenticated;

  isAuthenticated() {
    return this.authenticated;
  }

  setUserEmail(value: string) {
    this.authService.setLoginCredentialsEmail(value);
  }

  setUserPassword(value: string) {
    this.authService.setLoginCredentialsPassword(value);
  }

  setUserCurrentPassword(value: string) {
    this.userService.setUserCurrentPassword(value);
  }

  setUserNewPassword1(value: string) {
    this.userService.setUserNewPassword1(value);
  }

  setUserNewPassword2(value: string) {
    this.userService.setUserNewPassword2(value);
  }

  login() {
    this.authService.login();
  }

  logout() {
    this.authService.logout();
  }

  changePassword() {
    this.userService.changePassword();
  };

  ngOnInit() {
    var self = this;
    window.addEventListener('storage', function(e) {
      if (e.storageArea === localStorage) {
        self.authService.verifyToken();
      }
    });
  }

}
