'use strict';

angular.module('pleaks.view', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/view/:fileUri', {
    templateUrl: 'view/view.html'
  });
}])

.controller('ViewController', ['$scope', '$rootScope', '$http', '$routeParams', function(scope, root, http, routeParams) {
  var controller = this;
  
  scope.fileUri = routeParams.fileUri;
  
  console.log("Loading " + scope.fileUri);
  
  var BpmnViewer = window.BpmnJS;
  var viewer;
  
  var file;
  var noFile = false;

  http({
    method: 'GET',
    url: root.config.backend.host + '/rest/view/' + scope.fileUri
  }).then(function(response) {
    file = response.data;
    
    viewer = new BpmnViewer({ container: '#canvas' });
    viewer.importXML(file.content, function(err) {
      if (!err) {
        console.log('success!');
        viewer.get('canvas').zoom('fit-viewport');
      } else {
        console.log('something went wrong:', err);
      }
    });
  }, function(error) {
    noFile = true;
  });
  
  controller.getFileName = function() {
    return file.title;
  }
  
  controller.nothingFound = function() {
    return noFile;
  }

}]);
