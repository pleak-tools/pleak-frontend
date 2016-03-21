'use strict';

var PleakModeler = require('./pleaks-modeler');
var modeler = new PleakModeler({ container: '#canvas', keyboard: { bindTo: document } });

var $ = require('jquery');
var request = require('superagent');
var _ = require('lodash');

var domain = 'http://localhost:8000';
var backend = 'http://localhost:8080';

var fileName;
var fileMD5;
var fileBpmnXml;

//
// If model name arrived - requesting the model from the server.
//
var parentEvent;
window.addEventListener('message', function(event) {
  parentEvent = event;
  var origin = event.origin || event.originalEvent.origin;

  if (origin !== domain)
    return;
  fileName = event.data.fileName;

  if (event.data.type === 'edit') {
    request
      .get(backend + '/pleak/open?fileName=' + fileName)
      .withCredentials()
      .end(function(err, res){
        var resJson = JSON.parse(res.text);
        var diagram = resJson.content;
        fileMD5 = resJson.md5;
        openDiagram(diagram);
        $('#fileName').val(fileName);
      });
  }
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

saveButton.click( function(e) {
  $('#fileNameError').hide();
  request
    .post(backend + '/pleak/save')
    .field('fileName', $('#fileName').val())
    .field('fileMD5', fileMD5)
    .field('file', fileBpmnXml)
    .end(function(err, res){
      console.log(res);
      var resJson = JSON.parse(res.text);
      if (res.statusCode === 200) {
        $('#fileSaveSuccess').show();
        $('#fileSaveSuccess').fadeOut(5000);
        disableAllButtons();
        fileMD5 = resJson.text;
      } else if (res.statusCode === 409) {
        $('#fileNameError').show();
      }
    });
  parentEvent.source.postMessage("received", parentEvent.origin);
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

function disableAllButtons() {
  var downloadButton = $('#download-diagram');
  var downloadSvgButton = $('#download-svg');
  var saveButton = $('#save-diagram');
  downloadButton.removeClass('active');
  downloadSvgButton.removeClass('active');
  saveButton.removeClass('active');
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
      fileBpmnXml = data;

      saveButton.addClass('active');
      linkButton.addClass('active').attr({
        'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
        'download': name
      });
    } else {
      linkButton.removeClass('active');
      saveButton.removeClass('active');
    }
  }

  var exportArtifacts = _.debounce(function() {
    saveSVG(function(err, svg) {
      setEncoded(downloadSvgButton, fileName.slice(0, -5) + '.svg', err ? null : svg);
    });

    saveDiagram(function(err, xml) {
      setEncoded(downloadButton, fileName, err ? null : xml);
    });
  }, 500);

  modeler.on('commandStack.changed', exportArtifacts);
});

// expose bpmnjs to window for debugging purposes
window.bpmnjs = modeler;
