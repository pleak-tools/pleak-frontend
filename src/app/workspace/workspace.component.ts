import { Component, OnInit, Input } from '@angular/core';
import { AuthService } from "app/auth/auth.service";
import { RouteService } from "app/route/route.service";
import { UserService } from "app/user/user.service";

declare var $: any;

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html'
})
export class WorkspaceComponent implements OnInit {

  constructor(private authService: AuthService, private routeService: RouteService, private userService: UserService) {

    this.authService.authStatus.subscribe(status => {
      this.authenticated = status;
    });

    this.routeService.routeSubPage.subscribe(page => {
      this.subpage = page;
    });

  }

  authenticated: boolean;
  subpage;

  isAuthenticated() {
    return this.authenticated;
  }

  getUserEmail() {
    return this.authService.getUserEmail();
  }

  getClass(url) {
    return url === this.subpage ? 'active' : '';
  }

  getCurrentLocation() {
    return this.routeService.getCurrentUrl();
  }

  initLoginModal() {
    this.authService.initLoginModal();
  }

  initLogoutModal() {
    this.authService.initLogoutModal();
  }

  initChangePasswordModal() {
    this.userService.initChangePasswordModal();
  }

  ngOnInit() {
    var self = this;
    window.addEventListener('storage', function(e) {
      if (e.storageArea === localStorage) {
        self.authService.verifyToken();
      }
    });
  }

}
