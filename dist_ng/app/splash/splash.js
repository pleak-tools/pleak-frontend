'use strict';

angular.module('pleaks.splash', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/splash', {
    templateUrl: 'splash/splash.html',
  });
}])
