const request = require("request");


/////////////////////////////////////////////////////////////////////////////
// Add String.format() method if it's not existing
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}



///////////////////////////////////////////////////////////////////////
/// Call the Rest API
///////////////////////////////////////////////////////////////////////
function apiClientCallAsync( requestMethod, url,  access_token, body=null ){
    return new Promise(function (resolve, reject) {

        var options = null;
        switch (requestMethod.toLowerCase()) {
            case 'get':
                options = {
                    method: requestMethod,
                    url: url,
                    headers: {
                        Authorization: 'Bearer ' + access_token,
                        'Content-Type': 'application/json'
                    }
                };
                break;
            case 'post':
            case 'patch':
                options = {
                    method: requestMethod,
                    url: url,
                    headers: {
                        Authorization: 'Bearer ' + access_token,
                        'Content-Type': 'application/json'
                    },
                    body: body,
                    json: true
                };
                break;
            case 'delete':
                options = {
                    method: requestMethod,
                    url: url,
                    headers: {
                        Authorization: 'Bearer ' + access_token,
                        'Content-Type': 'application/json'
                    },
                };
                break;
            default:
                reject({
                    statusCode: 400,
                    statusMessage: 'request method is not supported'
                });
                break;
        }
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                let resp;
                try {
                    resp = JSON.parse(body)
                } catch (e) {
                    resp = body
                }
                if (response.statusCode >= 400) {
                    console.log('error code: ' + response.statusCode + ' response message: ' + response.statusMessage);
                    reject({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage
                    });
                } else {
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: resp
                    });
                }
            }
        });
    });    
}

module.exports = 
{ 
    apiClientCallAsync
};
    