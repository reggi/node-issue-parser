# Node Issue Parser

## Why?

As one of the organizers of [EmpireJS](https://github.com/EmpireJS) we reviewed and graded many great talk submissions. Each submission was entered into github as an issue in a repo, and each organizer commented on the issue with their grade. The rubrik is a simple markdown list in the comment.

When I finished commenting on all the issues I had no clue how to retrieve all this information I just entered. So I created this script to pull all the issues and comments and make one giant google spreadsheet.

## How?

* retrive all github issues
* retrieve all github issue comments
* parse the comment from markdown to html
* parse the list values from the html
* create a rows array with row objects within it
* use a csv parser to stringify the array object
* refresh google auth tokens
* upload csv to google drive

## Setting Up Google Drive

The first thing you need to do is generate Google oAuth Keys you can do that in the admin, [console.developers.google.com](https://console.developers.google.com). Then navigate to `APIs & auth` > `Creadentials` and click `Create new Client ID`. All you need to do is leave the default set to `Web application` and change the `AUTHORIZED JAVASCRIPT ORIGINS` url to `http://localhost:3000`. Click the `Download JSON` button and drop that file into this project, rename it to `client_secret.json` and you're good to go.

```
npm run google-auth
```

Now you have a `tokens.json` file you can make requests to google drive with.
