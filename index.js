var jsdom = require("jsdom");
var marked = require('marked');
var Promise = require("bluebird")
var debug = require("debug")("github")
var GitHubApi = require("github");

var github = new GitHubApi({
    version: "3.0.0",
    debug: false,
    protocol: "https"
});

github.authenticate({
    type: "oauth",
    token: process.env.TOKEN
})

github.issues = Promise.promisifyAll(github.issues)
jsdom = Promise.promisifyAll(jsdom)

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
  var html = marked(comment)
  var parsedComment = {}
  return jsdom.envAsync(html, ["http://code.jquery.com/jquery.js"]).then(function(window){
    var $ = window.$
    var total = 0
    $("ul:first li").each(function(){
      var $li = $(this)
      var split = $li.text().split(": ")
      var num = parseInt(split[1], 10)
      parsedComment[split[0]] = num
      total += num
    })
    parsedComment["total"] = total
    return parsedComment;
  })
}

getAllIssues().map(function(issue){
  return getComments(issue.number).then(function(comments){
    issue.comments = comments
    return Promise.resolve(comments).map(function(comment){
      var commentParsed = commentParser(comment.body)
      commentParsed.user = comment.user.login
      return commentParsed
    }).then(function(comments){
      issue.commentsParsed = comments
      return issue
    })
  })
}).then(function(issues){
  console.log(issues[0])
})
