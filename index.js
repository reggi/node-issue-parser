var stats = require("stats-lite")
var cheerio = require('cheerio')
var google = require('googleapis')
var googleDriveAuth = require("./google-drive-auth")
var _ = require("underscore")
var marked = require('marked')
var Promise = require("bluebird")
var debug = require("debug")("github")
var GitHubApi = require("github")
var csv = require("csv")

var github = new GitHubApi({
    version: "3.0.0",
    debug: false,
    protocol: "https"
});

github.authenticate({
    type: "oauth",
    token: process.env.TOKEN
})

csv = Promise.promisifyAll(csv)
github.issues = Promise.promisifyAll(github.issues)

function getComments(issueNumber){
  debug("fetching github comments for issue %s", issueNumber)
  return github.issues.getCommentsAsync({
    "user": "EmpireJS",
    "repo": "empirejs-cfp-2015",
    "state": "open",
    "number": issueNumber,
    "per_page": 100
  })
}

function getIssues(page, limit){
  debug("fetching github issue page %s", page)
  return github.issues.repoIssuesAsync({
    "user": "EmpireJS",
    "repo": "empirejs-cfp-2015",
    "state": "open",
    "page": page,
    "per_page": limit
  })
}

function getAllIssues(){
  var issues = []
  var limit = 100
  var page = 0
  function thenCallback(fetchedIssues){
    if(fetchedIssues) issues = issues.concat(fetchedIssues)
    if(!fetchedIssues || fetchedIssues && fetchedIssues.length == limit){
      page++
      return getIssues(page, limit).then(thenCallback)
    }else{
      return issues
    }
  }
  return Promise.resolve(thenCallback())
}

function commentParser(comment){
  debug("parsing comment")
  var html = marked(comment)
  var parsedComment = {}
  var $ = cheerio.load(html)
  var total = 0
  $("ul").eq(0).children("li").each(function(){
    var $li = $(this)
    var listCriteria = $li.text().split(": ")[0]
    // count for if someone didn't add space after colin
    var number = $li.text().replace(/\s+/g, "").split(":")[1]
    number = parseInt(number, 10)
    parsedComment[listCriteria] = number
    total += number
  })
  parsedComment["total"] = total
  return parsedComment;
}

function upload(google, title, body){
  var drive = google.drive("v2")
  drive.files = Promise.promisifyAll(drive.files)
  return drive.files.updateAsync({
    convert: true,
    fileId: "1EjnybvoHf4ioN8-utkiWMWeI8W9bTS9Rf-JR_qAGajg",
    resource: {
      title: title,
      mimeType: 'text/csv',
      parents: [{"id":"0B_wOyNleuKF0fmlvMWllZHdBZXFoV3pLV3pvSzI3OHZtbTVpSTZWV2gwZGVYMHhuZlFCeWs"}],
    },
    media: {
      mimeType: 'text/csv',
      body: body,
    }
  }).spread(function(data, response){
    return data
  })
}

getAllIssues().map(function(issue){
  return getComments(issue.number).then(function(comments){
    return Promise.resolve(comments).map(function(comment){
      var commentParsed = commentParser(comment.body)
      comment.parsed = commentParsed
      return comment
    }).then(function(comments){
      issue.comments = comments
      return issue
    })
  })
}, {concurrency: 30}).then(function(issues){
  debug("issues is %s long", issues.length)
  var rows = []

  _.each(issues, function(issue){
    if(!issue) debug("typeof issue %s", typeof issue)
    _.each(issue.comments, function(comment){
      var row = comment.parsed
      row.user = comment.user.login
      row.title = issue.title
      row.scope = "comment"
      row["Comment Url"] = comment.html_url
      row["Issue Url"] = issue.html_url
      rows.push(row)
    })
  })

  _.each(issues, function(issue){
    var row = {}
    var users = []
    _.each(issue.comments, function(comment){
      users.push(comment.user.login)
      _.each(comment.parsed, function(value, key){
        if(!row[key]) row[key] = 0
        row[key] += value
      })
    })
    row.user = users.join(", ")
    row.title = issue.title
    row["Comment Url"] = ""
    row["Issue Url"] = issue.url
    row.scope = "issue"
    rows.push(row)
  })
  return csv.stringifyAsync(rows, {"header": true})
}).then(function(csvString){
  return googleDriveAuth().then(function(oauth2Client){
    google.options({ auth: oauth2Client });
    return upload(google, "EmpireJS CFP", csvString).then(function(){
      debug("done!")
    })
  })
})
