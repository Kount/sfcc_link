'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

/**
 * @description creating of the ServiceDefinition object for the service
 */
var kountService = LocalServiceRegistry.createService('kount', {
    createRequest: function (svc, args) {
        var argsArray = [];
        var keys = Object.keys(args);

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            argsArray.push(key + '=' + args[key]);
        }

        svc.setRequestMethod('POST');
        svc.addHeader('Content-Type', 'application/x-www-form-urlencoded');

        return argsArray.join('&');
    },
    parseResponse: function (svc, client) {
        var kount = require('*/cartridge/scripts/kount/LibKount');
        var result;

        try {
            result = JSON.parse(client.text);
            return result;
        } catch (error) {
            kount.plainTextHandler(client.text);
            return {
                errorMessage: 'Kount call failed.'
            };
        }
    }
});

module.exports = kountService;
