var https = require('https');

module.exports = {
  getTokenResponseWithRefreshToken: function (resource, clientId, clientSecret, refreshToken, redirectUri, callback) {
    makeTokenRequest('grant_type=refresh_token&redirect_uri=' + encodeURIComponent(redirectUri) + '&client_id=' + clientId + '&client_secret=' + encodeURIComponent(clientSecret) + '&refresh_token=' + refreshToken + '&resource=' + resource, callback);
  },
  getTokenResponseWithCode: function (resource, clientId, clientSecret, code, redirectUri, callback) {
    makeTokenRequest('grant_type=authorization_code&redirect_uri=' + encodeURIComponent(redirectUri) + '&client_id=' + clientId + '&client_secret=' + encodeURIComponent(clientSecret) + '&code=' + code + '&resource=' + resource, callback);
  }
}

function makeTokenRequest(requestBody, callback) {
  var tokenResponseData = "";
  var tokenRequest = https.request({
    hostname: 'login.windows-ppe.net',
    port: 443,
    path: '/common/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, function(tokenResponse) {
    tokenResponse.on("error", function(error) {
      console.log(error.message);
    });
    tokenResponse.on("data", function(data) {
      tokenResponseData += data.toString();
    });
    tokenResponse.on("end", function() {
      callback(null, JSON.parse(tokenResponseData));
    });
  });
  tokenRequest.write(requestBody);
  tokenRequest.end();
};
