import { Component, OnInit } from '@angular/core';
import { AuthService } from 'app/auth/auth.service';
import { UserService } from 'app/user/user.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html'
})
export class WorkspaceComponent implements OnInit {

  constructor(public authService: AuthService, private userService: UserService, private route: ActivatedRoute) {
    route.data.subscribe(data => {
      if ('showLogin' in data && data.showLogin) {
        this.initLoginModal();
      }
    });
  }

  getUserEmail() {
    return this.authService.getUserEmail();
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
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.storageArea === localStorage) {
        this.authService.verifyToken();
      }
    });
  }

}
