'use strict';

var PleakModeler = require('./pleaks-modeler');
var modeler = new PleakModeler({ container: '#canvas', keyboard: { bindTo: document } });

var $ = require('jquery');
var request = require('superagent');
var _ = require('lodash');

var domain = 'http://localhost:8000';
var backend = 'http://localhost:8080';

var fileName;
var fileBpmn;

//
// If model name arrived - requesting the model from the server.
//
window.addEventListener('message', function(event) {
  var origin = event.origin || event.originalEvent.origin;

  if (origin !== domain)
    return;

  fileName = event.data;

  request
    .get(backend + '/pleak/open?fileName=' + fileName)
    .withCredentials()
    .end(function(err, res){
      var diagram = JSON.parse(res.text).text;
      openDiagram(diagram);
    });
}, false);

//
// Loading a new blank bpmn diagram by default.
//
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

//
// Saving the model.
//
var saveButton = $('#save-diagram');
saveButton.addClass('active');

saveButton.click( function(e) {
  request
    .post(backend + '/pleak/save')
    .send({ file: fileBpmn, fileName: fileName })
    .withCredentials()
    .end(function(err, res){
      console.log(res);
    });
});

//
// Downloading the model.
//
function saveSVG(done) {
  modeler.saveSVG(done);
}

function saveDiagram(done) {
  modeler.saveXML({ format: true }, function(err, xml) {
    done(err, xml);
  });
}

$(document).on('ready', function() {
  var downloadButton = $('#download-diagram');
  var downloadSvgButton = $('#download-svg');

  $('.buttons a').click(function(e) {
    if (!$(this).is('.active')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  function setEncoded(linkButton, name, data) {
    var encodedData = encodeURIComponent(data);

    if (data) {
      fileBpmn = 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData;

      linkButton.addClass('active').attr({
        'href': fileBpmn,
        'download': name
      });
    } else {
      linkButton.removeClass('active');
    }
  }

  var exportArtifacts = _.debounce(function() {
    saveSVG(function(err, svg) {
      setEncoded(downloadSvgButton, fileName + '.svg', err ? null : svg);
    });

    saveDiagram(function(err, xml) {
      setEncoded(downloadButton, fileName, err ? null : xml);
    });
  }, 500);

  modeler.on('commandStack.changed', exportArtifacts);
});

// expose bpmnjs to window for debugging purposes
window.bpmnjs = modeler;
