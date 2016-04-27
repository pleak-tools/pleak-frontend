'use strict';

// Declare app level module which depends on views, and components
angular.module('pleaks', [
  'ngRoute',
  'ngAnimate',
  'LocalStorageModule',
  'pleaks.splash',
  'pleaks.files',
  'pleaks.view',
  'pleaks.auth',
  'pleaks.menu',
]).
config(['$routeProvider', '$httpProvider', function($routeProvider, $httpProvider) {
  $routeProvider.otherwise({redirectTo: '/splash'});
}]).
run(function($rootScope, $http, AuthService) {
  $rootScope.user = null;

  // Read config
  $http.get('config.json')
    .success(function(data, status, headers, config) {
      $rootScope.config = data;
      // If the server has restarted then old tokens are obsolete. Must verify at startup.
      AuthService.verifyToken();
  })
    .error(function(data, status, headers, config) {
  });

});
