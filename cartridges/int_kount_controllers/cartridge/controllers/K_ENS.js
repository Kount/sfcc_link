/* global request response */

'use strict';

// API
var ISML = require('dw/template/ISML');

// Tools
var kount = require('*/cartridge/scripts/kount/LibKount');

/**
 * @description Handler for the Kount XML Event Notification System (ENS)
 */
function eventClassifications() {
    if (!kount.validateIpAddress(request.httpRemoteAddress)) {
        response.setStatus(401);
        return;
    }
    if (kount.isENSEnabled()) {
        kount.queueENSEventsForProcessing(request.httpParameterMap.getRequestBodyAsString());
    }
    ISML.renderTemplate('kount/confirmationENS');
}

/** @see module:controllers/K_ENS~EventClassifications */
exports.EventClassifications = eventClassifications;
exports.EventClassifications.public = true;
