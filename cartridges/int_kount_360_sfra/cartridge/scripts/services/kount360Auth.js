'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger').getLogger('kount360-auth', 'auth');
var Site = require('dw/system/Site');

var kount360TokenService = LocalServiceRegistry.createService('kount360.auth.token', {
    createRequest: function (service) {
        service.setRequestMethod('POST');

        service.addHeader('Content-Type', 'application/x-www-form-urlencoded');
        service.addHeader('Authorization', 'Basic ' + Site.getCurrent().getCustomPreferenceValue('kount360APIKey'));

        service.addParam('grant_type', 'client_credentials');
        service.addParam('scope', 'k1_integration_api');

        return '';
    },

    parseResponse: function (service, response) {
        if (response.statusCode !== 200) {
            Logger.error('Error in Kount 360 Auth call response status: {0}', response.status);
            return null;
        }
        return JSON.parse(response.text);
    },

    filterLogMessage: function (msg) {
        return msg;
    }
});

module.exports = kount360TokenService;
