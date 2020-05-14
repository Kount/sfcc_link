/* global request response session*/

'use strict';

// API
var BasketMgr = require('dw/order/BasketMgr');
var ISML = require('dw/template/ISML');

// Tools
var kount = require('*/cartridge/scripts/kount/libKount');

/**
 * @description Collect info about user on the billing page.
 * @constructor
 */
function DataCollector() {
    if (kount.isKountEnabled()) {
        if (request.httpRemoteAddress) {
            var basket = BasketMgr.getCurrentBasket();

            if (!kount.filterIP(request.httpRemoteAddress)) {
                ISML.renderTemplate('kount/dataCollector', {
                    Basket: basket
                });
            } else {
                session.privacy.sessId = session.sessionID.substr(0, 24).replace('-', '_', 'g') + basket.getUUID().substr(0, 8).replace('-', '_', 'g');
            }
        } else {
            kount.writeExecutionError(new Error("KOUNT: K.js: Can't get user IP"), 'DataCollector', 'error');
            return {
                error: 'Can\'t get user IP'
            };
        }
    } else {
        kount.writeExecutionError(new Error('KOUNT: K.js: Kount is not enabled'), 'DataCollector', 'info');
    }
}

/**
 * @description Renders "pixel" probe on the billing page
 * @return {void}
 * @constructor
 */
function Image() {
    ISML.renderTemplate('kount/logo');
}

/**
 * @description Renders template with fields to simulate a address verification and card verification
 * @return {void}
 */
function ExampleVerification() {
    if (kount.isKountEnabled() && kount.isExampleVerificationsEnabled()) {
        ISML.renderTemplate('kount/exampleverification');
    }
}

/** @see module:controllers/K~DataCollector */
exports.DataCollector = DataCollector;
exports.DataCollector.public = true;

/** @see module:controllers/K~Image */
exports.Image = Image;
exports.Image.public = true;

/** @see module:controllers/K~ExampleVerification */
exports.ExampleVerification = ExampleVerification;
exports.ExampleVerification.public = true;
