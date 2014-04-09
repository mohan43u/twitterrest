var fs = require('fs');
var url = require('url');
var http = require('http');
var querystring = require('querystring');
var TwitterRest = require('../lib/twitterrest');

var dbfilename = 'twitterrest.js.db';
try { var twitter_tokens = JSON.parse(fs.readFileSync(dbfilename)).twitter_tokens; } catch(e) {}
var twitterrest = new TwitterRest({'twitter_tokens': twitter_tokens});

var server = http.createServer(function(req, res) {
    var pathname = url.parse(req.url).pathname;

    console.log(pathname);

    if(pathname.match("/twitter/authorize$")) {
	twitterrest.authorize(req, function(res, response) {
	    if(response.statusCode == 200) {
		var body = [];
		response.on('data', function(chunk) {
		    this.push(chunk);
		}.bind(body));
		response.on('end', function(body) {
		    var tokens = querystring.parse(Buffer.concat(body).toString());
		    var turl = new url.Url();
		    turl.protocol = this.twitter_protocol;
		    turl.host = this.twitter_host;
		    turl.pathname = this.twitter_oauth_authenticate_uri;
		    turl.query = {'oauth_token': tokens.oauth_token};
		    res.writeHead(302, {'Location': url.format(turl)});
		    res.end();
		}.bind(this, body));
	    }
	    else {
		res.writeHead(response.statusCode, response.headers);
		response.pipe(res);
	    }
	}.bind(twitterrest, res));
    }
    else if(pathname.match("/twitter/authorized$")) {
	delete req.headers['accept-encoding'];
	twitterrest.get_access_token(req, function(res, dbfilename, response) {
	    if(response.error) {
		res.end(JSON.stringify(response));
	    }
	    else if(response.statusCode != 200) {
		res.writeHead(response.statusCode, response.headers);
		response.pipe(res);
	    }
	    else {
		var body = [];
		response.on('data', function(chunk) {
		    this.push(chunk);
		}.bind(body));
		response.on('end', function(res, body, dbfilename) {
		    var tokens = querystring.parse(Buffer.concat(body).toString());
		    if(this.twitter_tokens) {
			for(var k in tokens) {
			    this.twitter_tokens[k] = tokens[k]
			}
		    }
		    else {
			this.twitter_tokens = tokens;
		    }
		    fs.writeFile(dbfilename, JSON.stringify({'twitter_tokens': this.twitter_tokens}));
		    res.end(JSON.stringify({'oauth2': 'authorized'}));
		}.bind(this, res, body, dbfilename));
	    }
	}.bind(twitterrest, res, dbfilename));
    }
    else if(pathname.match("/twitter")) {
	if(!twitterrest.twitter_tokens) {
	    var redirect_url = new url.Url();
	    redirect_url.pathname = '/twitter/authorize';
	    res.writeHead(303, {
		'Location': url.format(redirect_url)
	    });
	    res.end();
	}
	else {
	    var turl = url.parse(req.url, true);
	    turl.pathname = pathname.substring(pathname.indexOf('/', 1));
	    delete turl.protocol;
	    delete turl.hostname;
	    delete turl.host;
	    if(turl.pathname.match(/^\/stream/g)) {
		turl.pathname = turl.pathname.substring(turl.pathname.indexOf('/', 1));
		turl.protocol = twitterrest.twitter_protocol;
		turl.host = twitterrest.twitter_stream_host;
	    }
	    else if(turl.pathname.match(/^\/userstream/g)) {
		turl.pathname = turl.pathname.substring(turl.pathname.indexOf('/', 1));
		turl.protocol = twitterrest.twitter_protocol;
		turl.host = twitterrest.twitter_userstream_host;
	    }
	    req.url = url.format(turl);
	    twitterrest.call_twitter(req, null, function(response){
		this.writeHead(response.statusCode, response.headers);
		response.pipe(this);
	    }.bind(res));
	}
    }
    else {
	res.end('nothing here!!');
    }
}).listen(3000);
