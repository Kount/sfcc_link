'use strict';

var Transaction = require('dw/system/Transaction');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var OrderMgr = require('dw/order/OrderMgr');
var Logger = require('dw/system/Logger').getLogger('kount', 'kountensqueue');

/**
 * Processes an ENS Event
 * @param {Object} EventHub - The EventHub instance which will handle the event
 * @param {Object} kount - The kountLib instance
 * @param {Object} event - The ENS Event Object
 */
function processENSEvent(EventHub, kount, event) {
    var eventRunner = EventHub[event.name.toString().toUpperCase()] || EventHub.RISK_CHANGE;
    if (eventRunner && event.orderNo) {
        try {
            eventRunner(event);
        } catch (e) {
            Logger.error('Cannot process kount ENS event entry. Error: ' + e.message + '\n' + e.stack);
            kount.writeExecutionError(new Error('KOUNT: ProcessKountENSQueue.js: EventHub: Order with number - ' + event.orderNo + ' failed to update. Stack: ' + e.stack), 'KountEventHub', 'error');
            try {
                var order = OrderMgr.getOrder(event.orderNo);
                order.custom.kount_ENSF = true;
            } catch (err) {
                Logger.error('Failed to flag order after failing to update order. Error: ' + err.message + '\n' + err.stack);
            }
        }
    }
}

/**
 * Processes an ENS Record which may contain multiple ENS Events
 * @param {Object} EventHub - The EventHub instance which will handle the event
 * @param {Object} kount - The kountLib instance
 * @param {Object} record - The ENS Record Custom Object to process
 */
function processENSRecord(EventHub, kount, record) {
    var events = JSON.parse(record.custom.ensResponseBody);
    for (var i = 0; i < events.length; i++) {
        var event = events[i];
        processENSEvent(EventHub, kount, event);
    }
}

/**
 * Main entry point for the Job call
 * @param {Object} args - Optional arguments to filter the search
 */
function execute() {
    var EventHub = require('*/cartridge/scripts/kount/kountEventHub');
    var kount = require('*/cartridge/scripts/kount/libKount');
    var results = CustomObjectMgr.queryCustomObjects('KountENSQueue', null, 'creationDate ASC', null);
    if (results.count > 0) {
        while (results.hasNext()) {
            var ensRecord = results.next();
            Transaction.begin();
            try {
                processENSRecord(EventHub, kount, ensRecord);
                CustomObjectMgr.remove(ensRecord);
                Transaction.commit();
            } catch (e) {
                Transaction.rollback();
                Logger.error('Failed to process ENS Record: ' + e.message + '\n' + e.stack);
                break;
            }
        }
    }
}

exports.execute = execute;
