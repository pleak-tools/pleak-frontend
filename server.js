var express = require("express");
var fs = require("fs");
var app = express();
var config = JSON.parse(fs.readFileSync('src/config.json', 'utf8'));


// For easier local debugging using with ng serve
// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "http://localhost:4200");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });

app.set('port', config.frontend.port);
app.use('/app/', express.static(__dirname + '/../' + config.frontend.folder + '/dist'));
app.use('/graph/:diagram_id/:run_number/:selected_dto/:dot_filename', express.static(__dirname + '/../' + config.pe_bpmn_editor.folder + '/src/app/editor/leaks-when-analysis/graphs'));
app.use('/pe-bpmn-editor/:id', express.static(__dirname + '/../' + config.pe_bpmn_editor.folder + '/dist'));
app.use('/pe-bpmn-editor/viewer/:id', express.static(__dirname + '/../' + config.pe_bpmn_editor.folder + '/dist'));
app.use('/sensitivities-editor/:id', express.static(__dirname + '/../' + config.sensitivities_editor.folder + '/dist'));
app.use('/sensitivities-editor/viewer/:id', express.static(__dirname + '/../' + config.sensitivities_editor.folder + '/dist'));
app.use('/guessing-advantage-editor/:id', express.static(__dirname + '/../' + config.guessing_advantage_editor.folder + '/dist'));
app.use('/guessing-advantage-editor/viewer/:id', express.static(__dirname + '/../' + config.guessing_advantage_editor.folder + '/dist'));
app.use('/', express.static(__dirname + '/../' + config.frontend.folder + '/dist'));
app.use(express.static(__dirname + '/../'));
app.use('*',express.static(__dirname + '/../' + config.frontend.folder + '/dist'));
app.listen(app.get('port'), function() {
  console.log("App is running at: http://localhost:" + app.get('port') + "/app/#/");
});
