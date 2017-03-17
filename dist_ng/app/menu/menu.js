'use strict';

angular.module('pleaks.menu', ['ngRoute'])

.controller('MenuController', ['$scope','$rootScope', '$location', 'AuthService', 'UserService', function(scope, root, location, AuthService, UserService) {
  var controller = this;

  scope.user = {
    email: '',
    password: ''
  };

  scope.userExtension = {
    currentPassword: '',
    newPassword1: '',
    newPassword2: ''
  }

  controller.getClass = function(url) {
    return location.url() === ('/' + url) ? 'active' : '';
  };

  controller.login = function() {
    showLoginLoading();
    AuthService.login(scope.user, loginSuccess, loginError);
  };

  controller.register = function() {
    AuthService.register(scope.user);
  };

  controller.isAuthenticated = function() {
    return AuthService.isAuthenticated();
  };

  controller.getUserEmail = function() {
    return AuthService.getUserEmail();
  };

  controller.logout = function() {
    showLogoutLoading();
    AuthService.logout(hideLogoutLoading);
    scope.user = {};
  };

  controller.changePassword = function() {
    showChangePasswordLoading();
    if (scope.userExtension.currentPassword && scope.userExtension.newPassword1 && scope.userExtension.newPassword2 && scope.userExtension.newPassword1 == scope.userExtension.newPassword2) {
      UserService.changePassword(scope.userExtension, changePasswordSuccess, changePasswordError);
    } else if (!scope.userExtension.currentPassword) {
      changePasswordError(403);
    } else {
      changePasswordError();
    }
    scope.userExtension = {};
  };

  var showLoginLoading = function() {
    $('#loginLoading').show();
    $('#loginForm').hide();
  };

  var loginSuccess = function() {
    $('#loginLoading').fadeOut("slow", function(){
      $('#loginForm').trigger('reset').show();
      $('#loginForm .help-block').hide();
      $('#loginForm .form-group').removeClass('has-error');
    });
    $('#loginModal').modal('hide');
    root.$broadcast("userAuthenticated", {});
  };

  var loginError = function(code) {
    $('#loginLoading').fadeOut("slow", function(){
      $('#loginForm .help-block').hide();
      $('#loginForm .form-group').addClass('has-error');
      $('#loginForm').show();
      if (code === 403 || code === 404) {
        $('#loginHelpCredentials').show();
      } else {
        $('#loginHelpServer').show();
      }
    });
  };

  var showLogoutLoading = function() {
    $('#logoutLoading').show();
    $('#logoutText').hide();
  };

  var hideLogoutLoading = function() {
    $('#logoutLoading').fadeOut("slow", function(){
      $('#logoutText').show();
    });
    $('#logoutModal').modal('hide');
    redirectHome();
  };

  var redirectHome = function() {
    location.path('/splash');
  };

  var showChangePasswordLoading = function() {
    $('#changePasswordLoading').show();
    $('#changePasswordForm').hide();
  };

  var changePasswordSuccess = function() {
    $('#changePasswordLoading').hide();
    $('#changePasswordForm').trigger('reset').show();
    $('#changePasswordForm .help-block').hide();
    $('#changePasswordForm .form-group').removeClass('has-error');
    $('#changePasswordModal').modal('hide');
  };

  var changePasswordError = function(code) {
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

  // Every time a modal is shown, if it has an autofocus element, focus on it.
  $('.modal').on('shown.bs.modal', function() {
    $(this).find('[autofocus]').focus();
  });

  $('#loginModal').on('hide.bs.modal', function (e) {
    $('#loginForm').trigger('reset');
    $('#loginForm .help-block').hide();
    $('#loginForm .form-group').removeClass('has-error');
  });

  $('#changePasswordModal').on('hide.bs.modal', function (e) {
    $('#changePasswordForm').trigger('reset');
    $('#changePasswordForm .help-block').hide();
    $('#changePasswordForm .form-group').removeClass('has-error');
  });

}]);
