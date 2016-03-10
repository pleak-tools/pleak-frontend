'use strict';

var CustomModeler = require('./pleaks-modeler');
var modeler = new CustomModeler({ container: '#canvas', keyboard: { bindTo: document } });

var request = require('superagent');

var domain = 'http://localhost:8000';
var backend = 'http://localhost:8080';

// if model name arrived - requesting the model from the server
window.addEventListener('message', function(event) {
  var origin = event.origin || event.originalEvent.origin;
  console.log(event);
  if (origin !== domain)
    return;

  console.log(event);
  var fileName = event.data;

  request
    .get(backend + '/pleak/open?fileName=' + fileName)
    .withCredentials()
    .end(function(err, res){
      console.log(res);

      var diagram = JSON.parse(res.text).text;
      openDiagram(diagram);
    });
}, false);

var newDiagramXML = require('../resources/newDiagram.bpmn');
openDiagram(newDiagramXML);

function openDiagram(diagram) {
  modeler.importXML(diagram, function(err) {
    if (err) {
      console.error('something went wrong:', err);
    }

    modeler.get('canvas').zoom('fit-viewport');
  });
}

// expose bpmnjs to window for debugging purposes
window.bpmnjs = modeler;
