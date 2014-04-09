### TwitterRest

A simple wrapper around twitter REST api

### Options

*    `twitter_api_key` =  registered twitter app's key. Default: 'HIBIVODD7Tq4kHBuHT9IRkIiV'
*    `twitter_api_secret` = registered twitter app's secret. Default: '1Mv7kVFW2Jm7bWHwkWjhiHPUhxkK8wYTZoKZRufvEF2Yoc4RMy'
*    `twitter_redirect_uri` = registered twitter app's redirect uri. Default: 'http://127.0.0.1:3000/twitter/authorized'
*    `twitter_tokens` = oauth tokens. Default: null
*    `twitter_protocol` = twitter site's protocol. Default: 'https'
*    `twitter_host` = twitter site's hostname. Default: 'api.twitter.com'
*    `twitter_stream_host` = twitter streaming site's hostname. Default: 'stream.twitter.com'
*    `twitter_userstream_host` = twitter user streaming site's hostname. Default: 'userstream.twitter.com'
*    `twitter_oauth_request_token_uri` = twitter site's oauth request_token uri. Default: '/oauth/request_token'
*    `twitter_oauth_authenticate_uri` = twitter site's oauth authenticate uri. Default: '/oauth/authenticate'
*    `twitter_oauth_access_token_uri` = twitter sites oauth access_token uri. Default: '/oauth/access_token'
*    `proxy` = proxy to use. Default: process.env['http_proxy']

### Example

See https://github.com/mohan43u/twitterrest/blob/master/example/twitterrest.js
