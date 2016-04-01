'use strict';

angular.module('pleaks.splash', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/splash', {
    templateUrl: 'splash/splash.html',
    controller: 'SplashController'
  });
}])
.controller('SplashController', ['$scope','$http', 'AuthService', function(scope, http, AuthService) {
  var controller = this;

  controller.isAuthenticated = function() {
    return AuthService.isAuthenticated();
  };

}]);
