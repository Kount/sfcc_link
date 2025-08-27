'use strict';

var Transaction = require('dw/system/Transaction');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Logger = require('dw/system/Logger').getLogger('kount-360', 'webhooks-queue');
var Status = require('dw/system/Status');

/**
 * Processes an ENS Event
 * @param {Object} record - The ENS Record Custom Object to process
 */
function processWebhookEvent(record) {
    var eventHub = require('*/cartridge/scripts/kount/kount360EventHub');
    var event = JSON.parse(record.custom.responseBody);

    eventHub.processEvent(event);
}

/**
 * Main entry point for the Job call
 * @param {Object} args - Optional arguments to filter the search
 * @returns {dw.system.Status} - System status
 */
/**
 * Removes a webhook record from the custom object storage.
 * @param {dw.object.CustomObject} record - The custom object to remove
 */
function removeWebhookRecord(record) {
    Transaction.wrap(function () {
        CustomObjectMgr.remove(record);
    });
}

/**
 * Main entry point for the Job call
 * @returns {dw.system.Status} - System status
 */
function execute() {
    var results = CustomObjectMgr.queryCustomObjects('Kount360WebhookQueue', null, 'creationDate ASC', null);
    if (results && results.count > 0) {
        while (results.hasNext()) {
            var webhookRecord = results.next();
            try {
                processWebhookEvent(webhookRecord);
                removeWebhookRecord(webhookRecord);
            } catch (e) {
                Logger.error('Failed to process Webhook Record: {0} {1}', e.message, e.stack);
            }
        }
    }
    return new Status(Status.OK);
}

exports.execute = execute;
