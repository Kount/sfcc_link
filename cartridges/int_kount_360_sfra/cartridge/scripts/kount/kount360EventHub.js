/* global empty */

'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var Order = require('dw/order/Order');

var Logger = require('dw/system/Logger').getLogger('kount-360', 'event-hub');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

/**
 * @description Updates order export status (status coming from the API call)
 * @param {string} orderStatus Workflow status in К360 Webhook Event Notification
 * @param {dw.order.Order} order SFCC Order object
 */
function updateOrderStatus(orderStatus, order) {
    Transaction.wrap(function () {
        if (orderStatus === 'APPROVED') {
            order.setExportStatus(Order.EXPORT_STATUS_READY);
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
        } else if (orderStatus === 'DECLINED') {
            order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        } else if (orderStatus === 'REVIEW') {
            order.setExportStatus(Order.EXPORT_STATUS_READY);
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        }
    });
}

/**
 * @description Fails or cancels an order based on the order status
 * @param {dw.order.Order} order - The order object
 */
function failOrCancelOrder(order) {
    if (order.status.value === Order.ORDER_STATUS_CREATED) {
        Transaction.wrap(function () {
            return OrderMgr.failOrder(order);
        });
    } else if (order.status.value === Order.ORDER_STATUS_NEW || order.status.value === Order.ORDER_STATUS_OPEN) {
        Transaction.wrap(function () {
            return OrderMgr.cancelOrder(order);
        });
    }
}

/**
 * @description Processes an order based on the order status
 * @param {dw.order.Order} order - The order object
 * @param {string} orderStatus - The order status
 */
function processOrder(order, orderStatus) {
    if (orderStatus === 'DECLINE') {
        failOrCancelOrder(order);
    } else if (orderStatus === 'APPROVE' && order.status.value === Order.ORDER_STATUS_CREATED && COHelpers) {
        var placeOrderResult = COHelpers.placeOrder(order, {});
        if (placeOrderResult.error) {
            throw new Error('Place order failed in proceed Order.');
        } else {
            COHelpers.sendConfirmationEmail(
                order,
                order.getCustomerLocaleID() || 'default'
            );
        }
    }
}

var eventRunner = {
    'Order.StatusChange': function (event) {
        var order = OrderMgr.getOrder(event.merchantOrderId);
        if (!order) {
            Logger.error('Order not found for merchant order ID: {0}', event.merchantOrderId);
            return false;
        }
        var status = event.newValue;
        Logger.info('Processing order status for merchant order ID: {0} to {1}', event.merchantOrderId, status);
        updateOrderStatus(status, order);
        processOrder(order, status);
        Transaction.wrap(function () {
            order.addNote('Kount 360 Event: ', JSON.stringify(event));
        });
        return true;
    }
};

/**
 * @description Hub for Webhook events
 * @param {Object} event - The event object
 */
function processEvent(event) {
    var eventType = event.eventType;
    if (eventRunner[eventType]) {
        eventRunner[eventType](event);
    } else {
        Logger.error('No handler found for event type: {0}', eventType);
    }
}

module.exports.processEvent = processEvent;
