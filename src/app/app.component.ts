import { Component, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';

import { Observable } from 'rxjs';

import { AuthService } from 'app/auth/auth.service';
import { UserService } from 'app/user/user.service';
import { filter } from 'rxjs/operators';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

  navStart: Observable<NavigationStart>;

  constructor(private authService: AuthService, private userService: UserService, private router: Router) {
    this.navStart = router.events.pipe(
      filter(evt => evt instanceof NavigationStart)
    ) as Observable<NavigationStart>;
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
  }

  ngOnInit() {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.storageArea === localStorage) {
        this.authService.verifyToken();
      }
    });

    this.navStart.subscribe(evt => {

      if (evt.url === '/#/files') {
        this.router.navigateByUrl('/files');
        return;

      } else if (evt.url.match(/\/#\/modeler\/(\d+)/)) {
        this.router.navigate(['modeler', evt.url.match(/\/#\/modeler\/(\d+)/)[1]]);
        return;

      } else if (evt.url.match(/\/app#\/view\/(\S+)/)) {
        this.router.navigateByUrl('/redirect');
        window.location.href = '/pe-bpmn-editor/viewer/' + evt.url.match(/\/app#\/view\/(\S+)/)[1];
        return;
      }


    });

  }

}
