import { Injectable } from '@angular/core';
import { Http, RequestOptions, Headers } from '@angular/http';
import { Subject } from "rxjs/Subject";
import { RouteService } from "app/route/route.service";

declare var $: any;
declare function require(name:string);

let jwt_decode = require('jwt-decode');
let config = require('../../config.json');

@Injectable()
export class AuthService {

  constructor(public http: Http, private routeService: RouteService) {
    this.verifyToken();
  }

  user = null;

  private loginCredentials = {
    email: '',
    password: ''
  };

  private authStatusBool = new Subject<boolean>();
  authStatus = this.authStatusBool.asObservable();

  setLoginCredentialsEmail(value: string) {
    this.loginCredentials.email = value;
  }

  setLoginCredentialsPassword(value: string) {
    this.loginCredentials.password = value;
  }

  loadRequestOptions() {
    var headers = new Headers();
    headers.append('JSON-Web-Token', localStorage.jwt);
    return new RequestOptions({ headers: headers });
  }

  verifyToken = function() {

    this.http.get(config.backend.host + '/rest/auth', this.loadRequestOptions()).subscribe(
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

  }

  authStatusChanged(status: boolean) {

    this.authStatusBool.next(status);

  }

  loginREST = function(user) {

    this.http.post(config.backend.host + '/rest/auth/login', user, this.loadRequestOptions()).subscribe(
      success => {

        if (success.status === 200) {

          var token = JSON.parse(success._body).token;
          localStorage.jwt = token;
          this.user = jwt_decode(token);
          this.authStatusChanged(true);
          this.loginSuccess();

        }

      },
      fail => {
        this.loginError(fail.status);
      }
    );

  }

  logoutREST = function() {

    this.http.get(config.backend.host + '/rest/auth/logout', this.loadRequestOptions()).subscribe(
      success => {
        delete localStorage.jwt;
        this.user = null;
        this.authStatusChanged(false);
        this.hideLogoutLoading();
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
    $('#loginLoading').fadeOut("slow", function() {
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
    $('#loginLoading').fadeOut("slow", function() {
      $('#loginForm .help-block').hide();
      $('#loginForm .form-group').addClass('has-error');
      $('#loginForm').show();
      if (code === 403 || code === 404 || code == 401) {
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
    $('#logoutLoading').fadeOut("slow", function() {
      $('#logoutText').show();
    });
    $('#logoutModal').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
    this.routeService.navigateToHome();
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
    this.waitForElement("loginModal", () => {
      $('#loginModal').find('#userEmail').focus();
    });
  }

  initLogoutModal() {
    $('#logoutModal').modal();
  }

}