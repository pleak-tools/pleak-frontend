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
    AuthService.login(scope.user);
  };
  controller.register = function() {
    AuthService.register(scope.user);
  };

  controller.isAuthenticated = function() {
    return AuthService.isAuthenticated();
  }

  controller.getUserEmail = function() {
    return AuthService.getUserEmail();
  }

  controller.logout = function() {
    AuthService.logout();
  }

}]);
