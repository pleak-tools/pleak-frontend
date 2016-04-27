'use strict';

angular.module('pleaks.menu', ['ngRoute'])

.controller('MenuController', ['$scope','$location', 'AuthService', function(scope, location, AuthService) {
  var controller = this;

  scope.user = {
    email: '',
    password: ''
  };

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
  };

  var showLoginLoading = function() {
    $('#loginLoading').show();
    $('#loginForm').hide();
  };

  var loginSuccess = function() {
    $('#loginLoading').fadeOut("slow", function(){
      $('#loginForm').show();
      $('.help-block').hide();
      $('.form-group').removeClass('has-error');
    });
    $('#loginModal').modal('hide');
  };

  var loginError = function(code) {
    $('#loginLoading').fadeOut("slow", function(){
      $('#loginForm').show();
      $('.form-group').addClass('has-error');
      if (code === 403) {
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

  // Every time a modal is shown, if it has an autofocus element, focus on it.
  $('.modal').on('shown.bs.modal', function() {
    $(this).find('[autofocus]').focus();
  });
}]);
