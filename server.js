var express = require("express");
var fs = require("fs");
var app = express();
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

app.set('port', config.frontend.port);
app.use(express.static(__dirname + '/dist'));
app.use(express.static(__dirname + '/dist_ng'));

app.listen(app.get('port'), function() {
  console.log("App is running at: http://localhost:" + app.get('port') + "/app/#/");
});
