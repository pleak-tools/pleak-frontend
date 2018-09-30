var express = require("express");
var fs = require("fs");
var app = express();
var config = JSON.parse(fs.readFileSync('src/config.json', 'utf8'));

app.set('port', config.frontend.port);
app.use('/app/', express.static(__dirname + '/../' + config.frontend.folder + '/dist'));
app.use('/sql-privacy-editor/:id', express.static(__dirname + '/../' + config.sql_editor.folder + '/dist'));
app.use('/sql-privacy-editor/viewer/:id', express.static(__dirname + '/../' + config.sql_editor.folder + '/dist'));
app.use('/graph/:id', express.static(__dirname + '/../' + config.sql_editor.folder + '/src/app/graphs'));
app.use('/pe-bpmn-editor/:id', express.static(__dirname + '/../' + config.pe_bpmn_editor.folder + '/dist'));
app.use('/pe-bpmn-editor/viewer/:id', express.static(__dirname + '/../' + config.pe_bpmn_editor.folder + '/dist'));
app.use('/sql-derivative-sensitivity-editor/:id', express.static(__dirname + '/../' + config.sql_derivative_sensitivity_editor.folder + '/dist'));
app.use('/sql-derivative-sensitivity-editor/viewer/:id', express.static(__dirname + '/../' + config.sql_derivative_sensitivity_editor.folder + '/dist'));
app.use('/guessing-advantage-editor/:id', express.static(__dirname + '/../' + config.guessing_advantage_editor.folder + '/dist'));
app.use('/guessing-advantage-editor/viewer/:id', express.static(__dirname + '/../' + config.guessing_advantage_editor.folder + '/dist'));
app.use('/', express.static(__dirname + '/../' + config.frontend.folder + '/dist'));
app.use('/combined-sensitivity-editor/:id', express.static(__dirname + '/../' + config.combined_sensitivity_editor.folder + '/dist'));
app.use('/combined-sensitivity-editor/viewer/:id', express.static(__dirname + '/../' + config.combined_sensitivity_editor.folder + '/dist'));
app.use(express.static(__dirname + '/../'));
app.listen(app.get('port'), function() {
  console.log("App is running at: http://localhost:" + app.get('port') + "/app/#/");
});