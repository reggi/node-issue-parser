var Promise = require("bluebird")
var express = require('express')
var app = express()
var google = require('googleapis')
var OAuth2 = google.auth.OAuth2
var clientSecrets = require("./client_secret.json")
var oauth2Client = new OAuth2(clientSecrets.web.client_id, clientSecrets.web.client_secret, clientSecrets.web.redirect_uris[0]);
oauth2Client.getToken = Promise.promisify(oauth2Client.getToken)
var fs = Promise.promisifyAll(require("fs"))

app.get('/', function (req, res) {
  var url = oauth2Client.generateAuthUrl({
    approval_prompt: "force",
    access_type: 'offline',
    scope: "https://www.googleapis.com/auth/drive"
  })
  return res.redirect(url)
})

app.get('/oauth2callback', function (req, res) {
  return oauth2Client.getToken(req.query.code).then(function(tokens){
    var content = JSON.stringify(tokens, undefined, 2)
    fs.writeFileAsync("./tokens.json", content, "utf8")
      .then(function(){
        res.json(tokens)
        process.exit()
      })
  }).catch(function(err){
    return res.redirect("/google")
  })
})

var server = app.listen(3000, function () {
  var spawn = require('child_process').spawn
  spawn('open', ['http://localhost:3000']);
})
