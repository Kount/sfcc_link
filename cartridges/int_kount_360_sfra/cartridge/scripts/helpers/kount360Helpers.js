'use strict';

/**
 * Get Kount 360 API authorization token
 * @returns {string|null} - Access token
 */
function getkount360Token() {
    var Logger = require('dw/system/Logger').getLogger('kount-360', 'auth');
    var kount360AuthService = require('*/cartridge/scripts/services/kount360Auth');
    var response;
    try {
        response = kount360AuthService.call();
    } catch (e) {
        Logger.error('Error in Kount 360 Auth call: {0} {1}', e.message, e.stack);
    }
    return response ? response.object : null;
}

/**
 * Gets cached value for the access token for Kount 360 API
 * @returns {string} - Kount API access token
 */
function getCachedToken() {
    var cacheUtils = require('*/cartridge/scripts/utils/cacheUtils');
    var today = new Date();
    var currentToken = cacheUtils.getCache('Kount360', 'oauth');

    if (
      currentToken &&
      currentToken.token &&
      currentToken.expiresAt - 60 > today.getTime()
    ) {
        return currentToken.token;
    }
    var tokenResponse = getkount360Token();
    var tokenExpiresIn = tokenResponse.expires_in * 1000;

    if (tokenResponse && tokenResponse.access_token) {
        cacheUtils.putCache('Kount360', 'oauth', {
            token: tokenResponse.access_token,
            expiresAt: today.getTime() + tokenExpiresIn
        });
        return tokenResponse.access_token;
    }

    return null;
}

/**
 * Parse Webhook request object to be stored as legacy ENS queue record
 * @param {string} webhookData - Webhook request data
 * @returns {string} eventRecord - ENS event record to be stored
 */
function parseWebhookToENSRecord(webhookData) {
    var result = [];
    var mappingUtils = require('*/cartridge/scripts/utils/mappingUtils');
    var kount360Mappings = require('*/cartridge/kount360mappings/index');
    var eventRecord = mappingUtils.transform(kount360Mappings.kount360WebhookToENSMapping, JSON.parse(webhookData));
    var eventResult = eventRecord ? mappingUtils.applyCustomMapping(eventRecord, kount360Mappings.kount360WebhookToENSValueMapping) : null;
    if (eventResult) {
        result.push(eventResult);
    }
    return JSON.stringify(result);
}

/**
 * @description Creates custom objects for webhook event batches
 * @param {string} requestBody Body from webhook request from Kount
 */
function storeWebhookEvent(requestBody) {
    try {
        var Transaction = require('dw/system/Transaction');
        var CustomObjectMgr = require('dw/object/CustomObjectMgr');
        var Site = require('dw/system/Site');
        var storeWebhookEventInENSQueue = Site.getCurrent().getCustomPreferenceValue('kount360useLegacyENSProcessing');
        var objectType = storeWebhookEventInENSQueue ? 'KountENSQueue' : 'Kount360WebhookQueue';
        var customProperty = storeWebhookEventInENSQueue ? 'ensResponseBody' : 'responseBody';

        Transaction.wrap(function () {
            var eventRecord = CustomObjectMgr.createCustomObject(objectType, require('dw/util/UUIDUtils').createUUID());
            eventRecord.custom[customProperty] = storeWebhookEventInENSQueue ? parseWebhookToENSRecord(requestBody) : requestBody;
        });
    } catch (e) {
        var Logger = require('dw/system/Logger').getLogger('kount-360', 'webhooks');
        Logger.error('Error in storeWebhookEvent: {0} {1}', e.message, e.stack);
    }
}

module.exports = {
    getCachedToken: getCachedToken,
    storeWebhookEvent: storeWebhookEvent
};
