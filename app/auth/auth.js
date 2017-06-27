'use strict';

angular.module('pleaks.auth', ['ngRoute'])

.config(['$httpProvider', function($httpProvider) {
  $httpProvider.interceptors.push('AuthInterceptor');
}])

.service('AuthService', ['$http', '$rootScope', function(http, root) {

  this.register = function(user) {
    http({
      method: 'POST',
      url: root.config.backend.host + '/rest/auth/register',
      data: user
    }).then(function(response) {
      if (response.status === 201) root.user = jwt_decode(response.data.token);
    });
  };

  this.login = function(user, success, error) {
    http({
      method: 'POST',
      url: root.config.backend.host + '/rest/auth/login',
      data: user
    }).then(function(response) {
      if (response.status === 200) root.user = jwt_decode(response.data.token);
      success();
    }, function(response) {
      error(response.status);
    });
  };

  this.logout = function(callback) {
    http({
      method: 'GET',
      url: root.config.backend.host + '/rest/auth/logout'
    }).then(function(response) {
      localStorage.removeItem('jwt');
      root.user = null;
      callback();
    }, function() {
      localStorage.removeItem('jwt');
      root.user = null;
      callback();
    });
  };

  this.isAuthenticated = function() {
    return root.user !== null;
  };

  this.getUserEmail = function() {
    return root.user.email;
  };

  this.verifyToken = function() {
    http({
      method: 'GET',
      url: root.config.backend.host + '/rest/auth'
    }).then(function(response) {
      // Token is still valid
    }, function(response) {
      // Token is not valid
      root.user = null;
      localStorage.removeItem('jwt');
    });
  };
}])

.factory('AuthInterceptor', function($q, $rootScope) {
  return {
    'request': function(config) {

      var token = localStorage.getItem('jwt');
      if (token !== null && token !== undefined && token !== "") $rootScope.user = jwt_decode(token);
      config.headers['JSON-Web-Token'] = token;
      return config;
    },
    'response': function(config) {

      if (config.data.token) {
        localStorage.setItem("jwt", config.data.token);
      }
      return config;
    }
  };

});
