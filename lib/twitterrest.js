var fs = require('fs');
var url = require('url');
var http = require('http');
var https = require('https');
var tunnel = require('tunnel');
var crypto = require('crypto');
var stream = require('stream');
var querystring = require('querystring');

var TwitterRest = function(options) {
    this.twitter_api_key = options.twitter_api_key || 'HIBIVODD7Tq4kHBuHT9IRkIiV';
    this.twitter_api_secret = options.twitter_api_secret || '1Mv7kVFW2Jm7bWHwkWjhiHPUhxkK8wYTZoKZRufvEF2Yoc4RMy';
    this.twitter_redirect_uri = options.twitter_redirect_uri || 'http://127.0.0.1:3000/twitter/authorized';
    this.twitter_tokens = options.twitter_tokens || null;
    this.twitter_protocol = options.twitter_protocol || 'https';
    this.twitter_host = options.twitter_host || 'api.twitter.com';
    this.twitter_stream_host = options.twitter_stream_host || 'stream.twitter.com';
    this.twitter_userstream_host = options.twitter_userstream_host || 'userstream.twitter.com';
    this.twitter_oauth_request_token_uri = options.twitter_oauth_request_token_uri || '/oauth/request_token';
    this.twitter_oauth_authenticate_uri = options.twitter_oauth_authenticate_uri || '/oauth/authenticate';
    this.twitter_oauth_access_token_uri = options.twitter_oauth_access_token_uri || '/oauth/access_token';
    this.proxy = options.proxy || process.env['http_proxy'];

    this.request = function(req, form, callback) {
	var turl = url.parse(req.url, true);
	var headers = (req.headers ? req.headers : {});
	delete headers['host'];
	if(form) {
	    form = querystring.stringify(form);
	    headers['Content-Length'] = form.length;
	    headers['Content-Type'] = 'application/x-www-form-urlencoded';
	}
	if(this.proxy) {
	    var proxyinitfunc = null;
	    var proxyurl = url.parse(this.proxy, true);
	    proxyurl.protocol = proxyurl.protocol || 'http:';
	    if(proxyurl.protocol == 'https:' && turl.protocol == 'https:') proxyinitfunc = tunnel.httpsOverhttps;
	    if(proxyurl.protocol == 'https:' && turl.protocol == 'http:') proxyinitfunc = tunnel.httpOverhttps;
	    if(proxyurl.protocol == 'http:' && turl.protocol == 'https:') proxyinitfunc = tunnel.httpsOverhttp;
	    if(proxyurl.protocol == 'http:' && turl.protocol == 'http:') proxyinitfunc = tunnel.httpOverhttp;
	    var proxy = proxyinitfunc({
		proxy: {
		    host: proxyurl.hostname,
		    port: proxyurl.port
		}
	    });
	}
	var clientrequest = (turl.protocol == 'https:' ? https : http).request({
	    'hostname': turl.hostname,
	    'port': turl.port,
	    'method': (req.method ? req.method : (form ? 'POST' : 'GET')),
	    'path': turl.path,
	    'headers': headers,
	    'agent': proxy
	});
	if(!(req instanceof stream.Readable) || form) {
	    if(form) clientrequest.write(form);
	    clientrequest.end();
	}
	else {
	    req.on('data', function(chunk){
		this.write(chunk);
	    }.bind(clientrequest));
	    req.on('end', function(){
		this.end();
	    }.bind(clientrequest));
	}
	clientrequest.on('response', function(callback, clientresponse){
	    callback(clientresponse);
	}.bind(this, callback));
    };

    this.get_default_oauth_params = function() {
	return {'oauth_version': '1.0',
		'oauth_timestamp': Math.floor(Date.now()/1000).toString(),
		'oauth_nonce': Array.prototype.filter.call(crypto.randomBytes(32).toString('base64'), function(v){return v.match(/[a-zA-Z0-9]/g);}).join(''),
		'oauth_signature_method': 'HMAC-SHA1',
		'oauth_consumer_key': this.twitter_api_key
	       };
    };

    this.percentencode = function(str) {
	return encodeURIComponent(str).replace(/[!'()]/g, escape).replace(/\*/g, "%2A");
    };

    this.get_parameterstring = function(params) {
	return Object.keys(params)
	    .map(function(params, v){return this.percentencode(v) + '=' + this.percentencode(params[v])}.bind(this, params))
	    .sort()
	    .join('&');
    };

    this.get_signingkey = function() {
	var result =  this.percentencode(this.twitter_api_secret)
	    + '&'
	    + (this.twitter_tokens ? this.twitter_tokens.oauth_token_secret : '');
	return result;
    };

    this.get_signature = function(method, uri, params) {
	var turl = url.parse(uri, true);
	delete turl.query;
	delete turl.search;
	turl = url.format(turl);
	var result = method.toUpperCase();
	result += '&';
	result += this.percentencode(turl);
	result += '&';
	result += this.percentencode(this.get_parameterstring(params));
	var hmac = crypto.createHmac('sha1', this.get_signingkey());
	hmac.update(result);
	return hmac.digest('base64');
    };

    this.get_authorization = function(method, uri, params) {
	var parray = Object.keys(params)
	    .filter(function(v) {return v.match(/^oauth/);})
	    .map(function(params, key) {return this.percentencode(key) + '="' + this.percentencode(params[key]) + '"'}.bind(this, params));
	parray.push('oauth_signature="' + this.percentencode(this.get_signature(method, uri, params)) + '"');
	return 'OAuth ' + parray.sort().join(', ');
    };

    this.authorize = function(req, callback) {
	var turl = url.parse(req.url, true);
	turl.protocol = this.twitter_protocol;
	turl.host = this.twitter_host;
	turl.pathname = this.twitter_oauth_request_token_uri;
	var params = this.get_default_oauth_params();
	for(var k in turl.query) {
	    params[k] = turl.query[k];
	}
	params['oauth_callback'] = this.twitter_redirect_uri;
	req.method = 'POST';
	req.url = url.format(turl);
	var headers = {'Authorization': this.get_authorization(req.method,
							       req.url,
							       params)
		      };
	req.headers = headers;
	this.request(req, null, callback);
    };

    this.get_access_token = function(req, callback) {
	var turl = url.parse(req.url, true);
	if(turl.query.denied) {
	    callback({'error': turl.query});
	}
	else {
	    turl.protocol = this.twitter_protocol;
	    turl.host = this.twitter_host;
	    turl.pathname = this.twitter_oauth_access_token_uri;
	    var params = this.get_default_oauth_params();
	    for(var k in turl.query) {
		params[k] = turl.query[k];
	    }
	    var form = {'oauth_token_verifier': params['oauth_token_verifier']};
	    req.method = 'POST';
	    req.url = url.format(turl);
	    var headers = {'Authorization': this.get_authorization(req.method,
								   req.url,
								   params)
			  };
	    req.headers = headers;
	    this.request(req, form, callback);
	}
    };

    this.call_twitter = function(req, form, callback) {
	var turl = url.parse(req.url, true);
	if(!turl.host
	   || turl.host == this.twitter_stream_host
	   || turl.host == this.twitter_userstream_host) {
	    turl.protocol = turl.protocol || this.twitter_protocol;
	    turl.host = turl.host || this.twitter_host;
	    var params = this.get_default_oauth_params();
	    params['oauth_token'] = this.twitter_tokens.oauth_token;
	    for(var k in turl.query) {
		params[k] = turl.query[k];
	    }
	    for(var k in form) {
		params[k] = form[k];
	    }
	    req.url = url.format(turl);
	    if(req instanceof stream.Readable && req.method != 'GET') {
		var body = [];
		req.on('data', function(chunk) {
		    this.push(chunk);
		}.bind(body));
		req.on('end', function(body, params, req, form, callback) {
		    var content  = querystring.parse(Buffer.concat(body).toString());
		    for(var k in content) {
			if(!form) form = {};
			params[k] = form[k] = content[k];
		    }
		    req.headers['Authorization'] = this.get_authorization(req.method, req.url, params);
		    this.request(req, form, callback);
		}.bind(this, body, params, req, form, callback));
	    }
	    else {
		req.headers['Authorization'] = this.get_authorization(req.method, req.url, params);
		this.request(req, form, callback);
	    }
	}
	else {
	    req.url = url.format(turl);
	    this.request(req, form, callback);
	}
    };
};

exports = module.exports = TwitterRest;