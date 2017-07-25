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

  var BpmnViewer = window.BpmnJS;
  var viewer;

  var file;

  var SqlBPMNModdle = {
    name: 'Pleak PA-BPMN & PE-BPMN',
    prefix: 'pleak',
    uri: 'http://pleak.io/',
    xml: {
    tagAlias: "lowerCase"
  },
  associations: new Array(),
  types: [
    {
      name: "SQLTask",
      extends: [
        "bpmn:Task"
      ],
      properties: [
        {
          "name": "sqlScript",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "sensitivityMatrix",
          "isAttr": false,
          "type": "String"
        }
      ]
    },
    {
      name: "StereotypeTask",
      extends: [
        "bpmn:Task"
      ],
      properties: [
        {
          "name": "PKEncrypt",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "PKDecrypt",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "PKComputation",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "MPC",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SKEncrypt",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SKDecrypt",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SKComputation",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SSSharing",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SSComputation",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SSReconstruction",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "AddSSSharing",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "AddSSComputation",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "AddSSReconstruction",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "FunSSSharing",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "FunSSComputation",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "FunSSReconstruction",
          "isAttr": false,
          "type": "String"
        },
      ]
    },
    {
      name: "SQLDataObjectReference",
      extends: [
        "bpmn:DataObjectReference"
      ],
      properties: [
        {
          "name": "sqlScript",
          "isAttr": false,
          "type": "String"
        }
      ]
    }
  ]
};

  var getPublishedFile = function(uri) {
    http({
      method: 'GET',
      url: root.config.backend.host + '/rest/directories/files/public/' + uri
    }).then(function success(response) {
      file = response.data;
      viewer = new BpmnViewer({
        container: '#viewer-canvas',
        moddleExtensions: {
          sqlExt: SqlBPMNModdle
        }
      });
      viewer.importXML(file.content, function(err) {
        if (!err) {
          viewer.get('#viewer-canvas').zoom('fit-viewport');
        } else {
          // error
        }
      });
    }, function failure(response) {

    });
  };

  controller.getFileName = function() {
    return file.title;
  }

  controller.nothingFound = function() {
    return file === undefined;
  }

  getPublishedFile(scope.fileUri);
}]);
