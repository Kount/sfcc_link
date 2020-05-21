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
        var kount = require('*/cartridge/scripts/kount/libKount');
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
    },
    filterLogMessage: function (msg) {
        var log = msg;
        log = log.replace(/"UAS": ".*?"/g, '"UAS": "*****"');
        log = log.replace(/"BROWSER": ".*?"/g, '"BROWSER": "*****"');
        log = log.replace(/"OS": ".*?"/g, '"OS": "*****"');
        log = log.replace(/"IP_IPAD": ".*?"/g, '"IP_IPAD": "*****"');
        log = log.replace(/"IP_LAT": ".*?"/g, '"IP_LAT": "*****"');
        log = log.replace(/"IP_LON": ".*?"/g, '"IP_LON": "*****"');
        log = log.replace(/"IP_COUNTRY": ".*?"/g, '"IP_COUNTRY": "*****"');
        log = log.replace(/"IP_REGION": ".*?"/g, '"IP_REGION": "*****"');
        log = log.replace(/"IP_CITY": ".*?"/g, '"IP_CITY": "*****"');
        log = log.replace(/"IP_ORG": ".*?"/g, '"IP_ORG": "*****"');
        log = log.replace(/EMAL=.*?\n/g, 'EMAL=*****\n');
        log = log.replace(/IPAD=.*?\n/g, 'IPAD=*****\n');
        log = log.replace(/PTOK=.*?\n/g, 'PTOK=*****\n');
        log = log.replace(/LAST4=.*?\n/g, 'LAST4=*****\n');
        log = log.replace(/B2A1=.*?\n/g, 'B2A1=*****\n');
        log = log.replace(/B2CC=.*?\n/g, 'B2CC=*****\n');
        log = log.replace(/B2CI=.*?\n/g, 'B2CI=*****\n');
        log = log.replace(/B2PC=.*?\n/g, 'B2PC=*****\n');
        log = log.replace(/B2PN=.*?\n/g, 'B2PN=*****\n');
        log = log.replace(/B2ST=.*?\n/g, 'B2ST=*****\n');
        log = log.replace(/NAME=.*?\n/g, 'NAME=*****\n');
        log = log.replace(/S2A1=.*?\n/g, 'S2A1=*****\n');
        log = log.replace(/S2CC=.*?\n/g, 'S2CC=*****\n');
        log = log.replace(/S2CI=.*?\n/g, 'S2CI=*****\n');
        log = log.replace(/S2EM=.*?\n/g, 'S2EM=*****\n');
        log = log.replace(/S2NM=.*?\n/g, 'S2NM=*****\n');
        log = log.replace(/S2PC=.*?\n/g, 'S2PC=*****\n');
        log = log.replace(/S2PN=.*?\n/g, 'S2PN=*****\n');
        log = log.replace(/S2ST=.*?\n/g, 'S2ST=*****\n');
        log = log.replace(/LAST4=\d{4}/g, 'LAST4=*****');
        return log;
    },
    getRequestLogMessage: function (req) {
        return req.split('&').join('\n');
    },
    getResponseLogMessage: function (res) {
        var log;
        try {
            var parsed = JSON.parse(res.text);
            log = JSON.stringify(parsed, null, 2);
        } catch (e) {
            log = res.text;
        }
        return log;
    }
});

module.exports = kountService;
