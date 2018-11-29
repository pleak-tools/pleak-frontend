import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';

import { BehaviorSubject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

declare var $: any;

declare function require(name: string);

const jwt_decode = require('jwt-decode');
const config = require('../../config.json');

@Injectable()
export class AuthService {

  constructor(public http: HttpClient, private router: Router, private location: Location, private toastr: ToastrService) {
    this.verifyToken();

    this.authStatus.subscribe((status) => {
      if (status === true) {
        let redirect = this.redirectUrl ? this.redirectUrl : '';

        if (redirect) {
          this.router.navigate([redirect], {skipLocationChange: true});
          this.location.replaceState(redirect);
          this.redirectUrl = '';
        } else if (this.router.routerState.snapshot.url === '/home/login') {
          this.router.navigate(['/home'], {skipLocationChange: true});
          this.location.replaceState('/home');
        }

        $('#loginModal').modal('hide');
      }
    });
  }

  user = null;
  redirectUrl = '';

  private loginCredentials = {
    email: '',
    password: ''
  };

  private authStatusBool = new BehaviorSubject<boolean|null>(null);
  authStatus = this.authStatusBool.asObservable();

  static loadRequestOptions(input: object | null = null): object {
    return Object.assign({headers: {'JSON-Web-Token': localStorage.jwt || ''}}, input);
  }

  setLoginCredentialsEmail(value: string) {
    this.loginCredentials.email = value;
  }

  setLoginCredentialsPassword(value: string) {
    this.loginCredentials.password = value;
  }


  verifyToken() {

    this.http.get(config.backend.host + '/rest/auth', AuthService.loadRequestOptions()).subscribe(
      success => {
        this.user = jwt_decode(localStorage.jwt);
        this.authStatusChanged(true);
      },
      fail => {
        delete localStorage.jwt;
        this.user = null;
        this.authStatusChanged(false);
        return false;
      }
    );

    return true;

  };

  authStatusChanged(status: boolean) {

    this.authStatusBool.next(status);

  }

  loginREST(user) {

    this.http.post(config.backend.host + '/rest/auth/login', user, AuthService.loadRequestOptions({observe: 'response'})).subscribe(
      (response: HttpResponse<any>) => {

        if (response.status === 200) {

          const token = response.body.token;
          localStorage.jwt = token;
          this.user = jwt_decode(token);
          this.authStatusChanged(true);
          this.loginSuccess();

          this.toastr.success('Logged in successfully');

        }

      },
      (fail: HttpResponse<any>) => {
        this.loginError(fail.status);
      }
    );

  }

  logoutREST() {

    this.http.get(config.backend.host + '/rest/auth/logout', AuthService.loadRequestOptions()).subscribe(
      success => {
        delete localStorage.jwt;
        this.user = null;
        this.authStatusChanged(false);
        this.hideLogoutLoading();

        this.toastr.info('Logged out successfully');
      },
      fail => {
        delete localStorage.jwt;
        this.user = null;
        this.authStatusChanged(false);
        this.hideLogoutLoading();
      }
    );

  }

  getUserEmail() {

    return this.user.email;

  }

  login() {
    this.showLoginLoading();
    this.loginREST(this.loginCredentials);
  }

  showLoginLoading() {
    $('#loginLoading').show();
    $('#loginForm').hide();
  };

  loginSuccess() {
    $('#loginLoading').fadeOut('slow', function () {
      $('#loginForm').trigger('reset').show();
      $('#loginForm .help-block').hide();
      $('#loginForm .form-group').removeClass('has-error');
    });
    $('#loginModal').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
    this.loginCredentials = {
      email: '',
      password: ''
    };
  };

  loginError(code) {
    $('#loginLoading').fadeOut('slow', function () {
      $('#loginForm .help-block').hide();
      $('#loginForm .form-group').addClass('has-error');
      $('#loginForm').show();
      if (code === 403 || code === 404 || code === 401) {
        $('#loginHelpCredentials').show();
      } else {
        $('#loginHelpServer').show();
      }
    });
  };

  logout() {
    this.showLogoutLoading();
    this.logoutREST();
    this.loginCredentials = {
      email: '',
      password: ''
    };
  }

  showLogoutLoading() {
    $('#logoutLoading').show();
    $('#logoutText').hide();
  };

  hideLogoutLoading() {
    $('#logoutLoading').fadeOut('slow', function () {
      $('#logoutText').show();
    });
    $('#logoutModal').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();

    // this.router.navigateByUrl('/home');

  };

  waitForElement(id, callback) {
    let interval = setInterval(() => {
      if (document.getElementById(id)) {
        clearInterval(interval);
        callback();
      }
    }, 500);
  }

  initLoginModal() {
    $('#loginModal').modal();
    this.waitForElement('loginModal', () => {
      $('#loginModal').find('#userEmail').focus();
    });
  }

  initLogoutModal() {
    $('#logoutModal').modal();
  }

}