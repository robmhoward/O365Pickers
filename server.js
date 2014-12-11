var express = require('express');
var https = require('https');
var decodejwt = require('./decodejwt.js');
var getAccessToken = require('./getAccessToken.js');
var cookieParser = require('cookie-parser')

var tokenCache = {};

var app = express();

//edog
var client_id = "0e77e4f8-e84b-462c-9071-8c5aa2e51677";
var client_secret = "3J8jWJX3xo5XeQnxSrVjxhwHR4bFEUruDlphxbiXzWw=";
var login_host = "login.windows-ppe.net";
var graph_host = "graph.ppe.windows.net";
/*
//prod
var client_id = "50f0fbd8-0632-45e5-92dc-b692bdaf5dbf";
var client_secret = "e/zEjKeSVaHVUlfqf2ptLcqnpQSMBpEBi3428LewghQ=";
*/

app.use('/', express.static(__dirname + "/public"));
app.use(cookieParser());

app.get('/', function(request, response) {
	var user = request.cookies.currentUser;
	if (user && user.oid && tokenCache[user.oid]) {
		response.writeHead(200, {"Content-Type": "text/plain"});
		response.write("Hello " + user.given_name + " " + user.family_name + "!");
		response.write("OID: " + user.oid);
		if (tokenCache[user.oid]) {
			response.write("Access Token: " + tokenCache[user.oid].accessToken);	
		}
	} else {
		var fullUrl = request.protocol + '://' + request.get('host') + '/catchcode';
		response.writeHead(302, {"Location": fullUrl});
	}
	response.end();
});

app.get('/getGroups', function(request, response) {
	var responseObject = {
	  "odata.metadata": "https://graph.ppe.windows.net/microsoft.com/$metadata#directoryObjects/Microsoft.WindowsAzure.ActiveDirectory.Group",
	  "value": [
	    {
	      "odata.type": "Microsoft.WindowsAzure.ActiveDirectory.Group",
	      "objectType": "Group",
	      "objectId": "1081e864-0bf7-4cc7-b111-9fc2bd744304",
	      "description": "Group for members of the ASG REST API Forum to discuss REST API design issues, solicit and provide API design feedback, and track upcoming API council issues.",
	      "dirSyncEnabled": null,
	      "displayName": "ASG REST API Forum",
	      "lastDirSyncTime": null,
	      "mail": "asgrestapiforum@MSFT.ccsctp.net",
	      "mailNickname": "asgrestapiforum",
	      "mailEnabled": true,
	      "provisioningErrors": [],
	      "proxyAddresses": [
	        "SMTP:asgrestapiforum@MSFT.ccsctp.net"
	      ],
	      "securityEnabled": false
	    }
	  ]
	};
	response.send(responseObject);
	response.end()
});

app.get('/groupChoices', function(request, response) {
	var currentUser = tokenCache[request.cookies.currentUser.oid];
	if (currentUser && currentUser.accessToken) {
		var groupResponseData = "";
		var groupRequest = https.request({
			hostname: graph_host,
			port: 443,
			path: '/' + request.cookies.currentUser.tid + '/users/' + request.cookies.currentUser.upn + '/memberOf?api-version=1.5',
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer ' + currentUser.accessToken
			}
		}, function(groupResponse) {
			groupResponse.on("error", function(error) {
				console.log(error.message);
			});
			groupResponse.on("data", function(data) {
				groupResponseData += data.toString();
			});
			groupResponse.on("end", function() {
				response.send(JSON.parse(groupResponseData));
				response.end()
			});
		});
		groupRequest.end();
	} else {
		response.writeHead(500);
		response.end();
	}
});

app.get('/siteChoices', function(request, response) {
	var search_host = 'msft-my.spoppe.com';
	var currentUser = tokenCache[request.cookies.currentUser.oid];
	getAccessToken.getTokenResponseWithRefreshToken("https://" + search_host + "/", client_id, client_secret, currentUser.refreshToken, "", function(error, tokenResponseData) {
		if (!error) {
			var siteResponseData = "";
			var siteRequest = https.request({
				hostname: search_host,
				port: 443,
				path: "/_api/search/query?querytext='contentclass:STS_Site'",
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Authorization': 'Bearer ' + tokenResponseData.access_token
				}
			}, function(siteResponse) {
				siteResponse.on("error", function(error) {
					console.log(error.message);
				});
				siteResponse.on("data", function(data) {
					siteResponseData += data.toString();
				});
				siteResponse.on("end", function() {
					response.send(JSON.parse(siteResponseData));
					response.end()
				});
			});
			siteRequest.end();
		} else {
			response.writeHead(500);
			response.end();
		}
	});

});


app.get('/catchcode', function(request, response) {
	var fullUrl = request.protocol + '://' + request.get('host') + request.path;
	if (!request.query.code) {
		response.writeHead(302, {"Location": "https://" + login_host + "/common/oauth2/authorize?client_id=" + client_id + "&response_type=code&redirect_uri=" + fullUrl});
		response.end();
	} else {
		getAccessToken.getTokenResponseWithCode("https://" + graph_host + "/", client_id, client_secret, request.query.code, fullUrl, function(error, tokenResponseData) {
			var idToken = decodejwt.decodeJwt(tokenResponseData.id_token).payload;
			tokenCache[idToken.oid] = { 
				accessToken: tokenResponseData.access_token,
				refreshToken: tokenResponseData.refresh_token,
				idToken: idToken 
			}
			response.cookie('currentUser', idToken, { maxAge: 900000, httpOnly: true });
			response.writeHead(302, {"Location": request.protocol + '://' + request.get('host') + '/'});
			response.end();
			//response.end("Got an id token! " + JSON.stringify(idToken, null, 2));			
		});
	}
});

app.listen(8081);