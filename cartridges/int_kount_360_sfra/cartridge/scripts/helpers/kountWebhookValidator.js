'use strict';

var Site = require('dw/system/Site');
var Signature = require('dw/crypto/Signature');
var StringUtils = require('dw/util/StringUtils');
var Logger = require('dw/system/Logger').getLogger('kount-360', 'webhook-validator');

/**
 * @description Validates the timestamp of the webhook request.
 * @param {string} timestampHeader - The value of the 'X-Event-Timestamp' header.
 * @returns {boolean} - True if the timestamp is valid, false otherwise.
 */
function validateTimestamp(timestampHeader) {
    var gracePeriod = Site.getCurrent().getCustomPreferenceValue('kount360WebhookGracePeriod');
    if (!timestampHeader) {
        return false;
    }

    try {
        var eventTime = new Date(timestampHeader).getTime();
        var currentTime = new Date().getTime();
        var timeDifference = Math.abs(currentTime - eventTime) / 1000;

        return timeDifference <= gracePeriod;
    } catch (e) {
        return false;
    }
}

/**
 * @description Verifies the signature of the Kount webhook.
 * @param {dw.system.Request} req - The request object from the controller.
 * @returns {boolean} - True if the signature is valid, false otherwise.
 */
function validateSignature(req) {
    var publicKeyBase64 = Site.getCurrent().getCustomPreferenceValue('kount360WebhookPublicKey');
    var timestampHeader = req.httpHeaders.get('x-event-timestamp');
    var signatureHeader = req.httpHeaders.get('x-event-signature');
    var requestBody = req.body;

    if (!timestampHeader || !signatureHeader || !requestBody) {
        return false;
    }

    try {
        var dataToVerify = timestampHeader + requestBody;
        var verifier = new Signature();

        return verifier.verifySignature(
            signatureHeader,
            StringUtils.encodeBase64(dataToVerify),
            publicKeyBase64,
            'SHA256withRSA/PSS'
        );
    } catch (e) {
        Logger.error('Error during signature verification: ' + e.toString());
        return false;
    }
}

/**
 * @description Validates an incoming Kount webhook request.
 * @param {dw.system.Request} req - The request object from the controller.
 * @returns {{valid: boolean, error: string}} - An object indicating if the validation was successful.
 */
function validate(req) {
    if (!validateTimestamp(req.httpHeaders.get('x-event-timestamp'))) {
        return { valid: false, error: 'Invalid or expired timestamp.' };
    }

    if (!validateSignature(req)) {
        return { valid: false, error: 'Invalid signature.' };
    }

    return { valid: true, error: null };
}

module.exports = {
    validate: validate
};
