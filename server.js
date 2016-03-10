var express = require("express");
var app = express();

app.set('port', (process.env.PORT || 8000));
app.use(express.static(__dirname + '/dist'));
app.use(express.static(__dirname + '/dist_ng'));

app.listen(app.get('port'), function() {
  console.log("App is running at localhost:" + app.get('port'));
});
