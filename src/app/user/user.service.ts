import { Injectable } from '@angular/core';
import { Http, RequestOptions, Headers } from '@angular/http';
import { AuthService } from "app/auth/auth.service";

declare var $: any;
declare function require(name:string);

let config = require('../../config.json');

@Injectable()
export class UserService {

  constructor(public http: Http, private authService: AuthService) {}

  private userExtension = {
    currentPassword: '',
    newPassword1: '',
    newPassword2: ''
  }


  setUserCurrentPassword(value: string) {
    this.userExtension.currentPassword = value;
  }

  setUserNewPassword1(value: string) {
    this.userExtension.newPassword1 = value;
  }

  setUserNewPassword2(value: string) {
    this.userExtension.newPassword2 = value;
  }

  changePasswordREST(user) {

    var userObject = {currentPassword: user.currentPassword, newPassword: user.newPassword1};

    this.http.put(config.backend.host + '/rest/user/password', userObject, this.authService.loadRequestOptions()).subscribe(
      success => {

        if (success.status === 200) {

          this.changePasswordSuccess();

        }

      },
      fail => {
        this.changePasswordError(fail.status);
      }
    );

  }

  changePassword() {
    this.showChangePasswordLoading();
    if (this.userExtension.currentPassword && this.userExtension.newPassword1 && this.userExtension.newPassword2 && this.userExtension.newPassword1 == this.userExtension.newPassword2) {
      this.changePasswordREST(this.userExtension);
    } else if (!this.userExtension.currentPassword) {
      this.changePasswordError(403);
    } else {
      this.changePasswordError(null);
    }
    this.userExtension = {
      currentPassword: '',
      newPassword1: '',
      newPassword2: ''
    }
  };

  showChangePasswordLoading() {
    $('#changePasswordLoading').show();
    $('#changePasswordForm').hide();
  };

  changePasswordSuccess() {
    $('#changePasswordLoading').hide();
    $('#changePasswordForm').trigger('reset').show();
    $('#changePasswordForm .help-block').hide();
    $('#changePasswordForm .form-group').removeClass('has-error');
    $('#changePasswordModal').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
  };

  changePasswordError(code) {
    $('#changePasswordLoading').hide();
    $('#changePasswordForm .help-block').hide();
    $('#changePasswordForm').trigger('reset').show();
    $('#changePasswordForm .form-group').addClass('has-error');
    if (code === 403) {
      $('#changePasswordHelpCredentials1').show();
    } else if (code === 400) {
      $('#changePasswordHelpCredentials2').show();
    } else if (code == 409) {
      $('#changePasswordHelpServer').show();
    } else {
      $('#changePasswordHelpCredentials3').show();
    }
  };

  waitForElement(id, callback) {
    let interval = setInterval(() => {
      if (document.getElementById(id)) {
        clearInterval(interval);
        callback();
      }
    }, 500);
  }

  initChangePasswordModal() {
    $('#changePasswordModal').modal();
    this.waitForElement("changePasswordModal", () => {
      $('#changePasswordModal').find('#currentPassword').focus();
    });
  }

}