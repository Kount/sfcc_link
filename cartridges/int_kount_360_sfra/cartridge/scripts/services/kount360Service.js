'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var kount360Helpers = require('*/cartridge/scripts/helpers/kount360Helpers');

var kount360APIService = LocalServiceRegistry.createService('kount360.rest.api', {
    createRequest: function (service, requestData) {
        service.setRequestMethod(requestData.method);

        var svcCredentials = service.getConfiguration().getCredential();
        var url = svcCredentials.getURL();

        service.setURL(null);

        var queryParams = [];
        if (requestData.params) {
            Object.keys(requestData.params).forEach(function (key) {
                queryParams.push(key + '=' + requestData.params[key]);
            });
        }

        if (requestData.pathParam) {
            url = url + '/' + requestData.pathParam;
        }

        url = queryParams.length > 0 ? url + '?' + queryParams.join('&') : url;
        service.setURL(url);

        service.addHeader('Content-Type', 'application/json');
        service.addHeader('Authorization', 'Bearer ' + kount360Helpers.getCachedToken());

        return JSON.stringify(requestData.requestBody);
    },

    parseResponse: function (service, response) {
        return response.text;
    },

    filterLogMessage: function (msg) {
        return msg;
    }
});

module.exports = kount360APIService;
