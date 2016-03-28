'use strict';

// Declare app level module which depends on views, and components
angular.module('pleaks', [
  'ngRoute',
  'pleaks.splash',
  'pleaks.files',
  'pleaks.view'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/splash'});
}]);
