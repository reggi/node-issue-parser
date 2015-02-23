var Promise = require("bluebird")
var moment = require("moment")
var google = require('googleapis')
var fs = Promise.promisifyAll(require("fs"))
var OAuth2 = google.auth.OAuth2
var clientSecrets = require("./client_secret.json")
var tokens = require("./tokens.json")

function googleDriveAuth(){
  var oauth2Client = new OAuth2(clientSecrets.web.client_id, clientSecrets.web.client_secret, clientSecrets.web.redirect_uris[0]);
  oauth2Client.refreshAccessToken = Promise.promisify(oauth2Client.refreshAccessToken)
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });
  var tokenExpireDate = moment(tokens.expiry_date, "x")
  var tokenIsExpired = moment().isAfter(tokenExpireDate)
  if(!tokenIsExpired) return Promise.resolve(oauth2Client)
  return oauth2Client.refreshAccessToken().then(function(tokens){
    fs.writeFileAsync("./tokens.json", JSON.stringify(tokens, undefined, 2), "utf8");
    return oauth2Client
  })
}

module.exports = googleDriveAuth
