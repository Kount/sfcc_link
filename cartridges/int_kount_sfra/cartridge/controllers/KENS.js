/* global request response */

'use strict';

var server = require('server');

// Tools
var kount = require('*/cartridge/scripts/kount/libKount');

/**
 * @description Handler for the Kount XML Event Notification System (ENS)
 * @returns {void | boolean}
 */
server.use('EventClassifications', function (req, res, next) {
    if (!kount.validateIpAddress(request.httpRemoteAddress)) {
        response.setStatus(401);
        return null;
    }
    if (kount.isENSEnabled()) {
        kount.queueENSEventsForProcessing(request.httpParameterMap.getRequestBodyAsString());
    }
    res.render('kount/confirmationENS');
    return next();
});

module.exports = server.exports();
