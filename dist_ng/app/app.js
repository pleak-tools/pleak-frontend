'use strict';

// Declare app level module which depends on views, and components
angular.module('pleaks', [
  'ngRoute',
  'ngAnimate',
  'ngStorage',
  'pleaks.splash',
  'pleaks.files',
  'pleaks.view',
  'pleaks.auth',
  'pleaks.menu',
]).
config(['$routeProvider', '$httpProvider', function($routeProvider, $httpProvider) {
  $routeProvider.otherwise({redirectTo: '/splash'});
}]).
run(function($rootScope, $http, $location, AuthService, $localStorage) {
  $rootScope.user = null;

  $rootScope.location = $location;

  $rootScope.menuVisible = function (location) {
    return (location.path().indexOf('/view') === -1);
  }

  // Read config
  $http.get('config.json')
    .success(function(data, status, headers, config) {
      $rootScope.config = data;
      // If the server has restarted then old tokens are obsolete. Must verify at startup.
      AuthService.verifyToken();
  })
    .error(function(data, status, headers, config) {
  });

  // Watch token for changes
  $rootScope.$watch(function () {
    return $localStorage.jwt;
  }, function(newVal, oldVal) {
    if (oldVal !== newVal) {
      AuthService.verifyToken();
    }
  });

});
