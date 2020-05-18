/* global empty */

'use strict';

// API
var OrderMgr = require('dw/order/OrderMgr');
var Site = require('dw/system/Site').current;
var Resource = require('dw/web/Resource');
var Pipeline = require('dw/system/Pipeline');
var Transaction = require('dw/system/Transaction');
var Order = require('dw/order/Order');

// Scripts
var AttrUpdater = require('*/cartridge/scripts/kount/updateCustomAttribute');
var ProductInventory = require('*/cartridge/scripts/kount/checkProductInventory');
var Logger = require('dw/system/Logger').getLogger('kount', 'KountEventHub');

// Tools
var kount = require('*/cartridge/scripts/kount/libKount');
var COHelpers;
var EmailHelper;
var EmailModel;
var OrderModel;
var controllersApp;

if (!kount.isSFRA()) {
    // Core APP
    controllersApp = require('*/cartridge/scripts/app') || { getModel: function () {} };
    // Models
    EmailModel = controllersApp.getModel('Email');
    OrderModel = controllersApp.getModel('Order');
} else {
    COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    EmailHelper = require('*/cartridge/scripts/kount/emailHelper');
    EmailModel = null;
    OrderModel = null;
}

// Const
var constants = require('*/cartridge/scripts/kount/kountConstants');
var statusMap = { A: 'APPROVED', D: 'DECLINED', R: 'HOLD', E: 'HOLD' };

/**
 * @description Updates order export status (status coming from the API call)
 * @param {string} KountOrderStatus Workflow status in Kount Event Notification
 * @param {Order} order SFCC Order object
 */
function updateOrderStatus(KountOrderStatus, order) {
    var status = statusMap[KountOrderStatus];

    // Special case if Kount order status is HOLD
    Transaction.wrap(function () {
        if (status === 'APPROVED') {
            order.setExportStatus(Order.EXPORT_STATUS_READY);
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
        } else if (status === 'DECLINED') {
            order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        }
    });
}

/**
 * @description Hub for ENS events.
 * @type {{WORKFLOW_STATUS_EDIT: Hub.'WORKFLOW_STATUS_EDIT', WORKFLOW_REEVALUATE: Hub.'WORKFLOW_REEVALUATE', WORKFLOW_NOTES_ADD: Hub.'WORKFLOW_NOTES_ADD', RISK_CHANGE: Hub.'RISK_CHANGE', proceedOrder: Hub.'proceedOrder', failOrder: Hub.'failOrder', createGiftCertificates: Hub.'createGiftCertificates', sendMail: Hub.'sendMail', sendRiskMail: Hub.'sendRiskMail', Error: Hub.'Error'}}
 */
var Hub = {
    WORKFLOW_STATUS_EDIT: function (event, req) {
        var order = OrderMgr.getOrder(event.orderNo);

        if (!order) return Hub.Error(event.orderNo);
        var orderStatus = order.status;
        var status = statusMap[event.newValue];
        if (order.custom.kount_ENSF === true) {
            kount.sendEmailNotification('The Kount Event Notification System tried to update Order #' + order.orderNo + '. However, this order was previously flagged in a previous ENS update. This order should be manually updated in Business Manager if necessary.');
            return false;
        }
        if (orderStatus.value !== Order.ORDER_STATUS_CREATED) {
            try {
                kount.sendEmailNotification('The Kount Event Notification System tried to update Order #' + order.orderNo + ' but the order was in ' + orderStatus.displayValue + ' status. The Kount status sent was: ' + status);
                order.custom.kount_ENSF = true;
            } catch (e) {
                Logger.error('ERROR: ' + e.message + '\n' + e.stack);
            }
            return false;
        } else if (orderStatus.value === Order.ORDER_STATUS_CREATED && status === 'HOLD') {
            try {
                kount.sendEmailNotification('The Kount Event Notification System tried to update Order #' + order.orderNo + ' but the order was already in the created status. The Kount status sent was: ' + status);
            } catch (e) {
                Logger.error('ERROR: ' + e.message + '\n' + e.stack);
            }
            return false;
        }

        updateOrderStatus(event.newValue, order);
        var result = AttrUpdater.update(event, 'Status', order);

        Hub.sendRiskMail(result.mailTo, event);
        Hub.proceedOrder(result, order, req);
        return true;
    },
    WORKFLOW_REEVALUATE: function (event) {
        return Hub.sendRiskMail(AttrUpdater.update(event, 'SCOR', OrderMgr.getOrder(event.orderNo)).mailTo, event);
    },
    WORKFLOW_NOTES_ADD: function (event) {
        return Hub.sendRiskMail(AttrUpdater.update(event, 'REASON_CODE', OrderMgr.getOrder(event.orderNo)).mailTo, event);
    },
    RISK_CHANGE: function (event) {
        if (constants.ALLOWED_RISK_PARAMS.indexOf(event.attributeName) !== -1) {
            return Hub.sendRiskMail(AttrUpdater.update(event, event.attributeName, OrderMgr.getOrder(event.orderNo)).mailTo, event);
        }
        return true;
    },
    proceedOrder: function (orderDetails, order, req) {
        if (orderDetails.orderStatus === 'StatusDECLINED') {
            Hub.failOrder(order);
        } else if (orderDetails.orderStatus === 'StatusAPPROVED') {
            ProductInventory.check(order, function (inventoryExist) {
                if (inventoryExist) {
                    var placeOrderResult;
                    if (kount.isSFRA()) {
                        placeOrderResult = COHelpers.placeOrder(order, { status: 'approved' });
                        if (placeOrderResult.error) {
                            throw new Error('Place order failed in proceed Order.');
                        } else {
                            COHelpers.sendConfirmationEmail(order, req ? req.locale.id : 'default');
                        }
                    } else { // is not sfra version
                        placeOrderResult = OrderModel.submit(order, 'APPROVED');
                        if (placeOrderResult.error) {
                            throw new Error('Place order failed in proceed Order.');
                        } else {
                            Hub.sendMail(
                                'mail/orderconfirmation',
                                order.customerEmail,
                                Resource.msg('order.orderconfirmation-email.001', 'order', null) + ' ' + order.orderNo,
                                { Order: order }
                            );
                        }
                    }
                } else { // don't have inventory
                    Hub.failOrder(order);
                }
            });
        }
    },
    failOrder: function (order) {
        Transaction.wrap(function () {
            return OrderMgr.failOrder(order);
        });
    },
    createGiftCertificates: function (order) {
        var gc;
        if (OrderModel) {
            var GiftCertificate = require('*/cartridge/scripts/models/GiftCertificateModel');
            Transaction.wrap(function () {
                gc = order.getGiftCertificateLineItems().toArray().map(function (lineItem) {
                    return GiftCertificate.createGiftCertificateFromLineItem(lineItem, order.getOrderNo());
                });
            });
        } else {
            gc = Pipeline.execute('COPlaceOrder-CreateGiftCertificates', {
                Order: order
            });
        }
        if (gc) {
            for (var i = 0; i < gc.length; i++) {
                var giftCertificate = gc[i];

                Hub.sendMail(
                    'mail/giftcert',
                    giftCertificate.recipientEmail,
                    Resource.msg('resource.ordergcemsg', 'email', null) + ' ' + giftCertificate.senderName,
                    { GiftCertificate: giftCertificate }
                );
            }
        }
    },
    sendMail: function (template, recipient, subject, data) {
        if (EmailModel) {
            EmailModel.get(template, recipient)
                .setSubject(subject)
                .send(data);
        } else {
            Pipeline.execute('Mail-SecureSend', {
                MailSubject: subject,
                MailTo: recipient,
                MailFrom: kount.getNotificationEmail(),
                MailTemplate: template
            });
        }
    },
    sendRiskMail: function (mailTo, event) {
        if (!empty(event) && Site.getCustomPreferenceValue('kount_RISK_CHANGE_' + event.attributeName)) {
            if (EmailModel) {
                EmailModel.get('mail/riskChange', mailTo)
                    .setSubject('Notification mail')
                    .setFrom(kount.getNotificationEmail())
                    .send({ EventData: event });
            } else if (kount.isSFRA()) {
                EmailHelper.sendEmail({
                    template: 'mail/riskChange',
                    subject: 'Notification mail',
                    to: mailTo,
                    from: kount.getNotificationEmail(),
                    data: { EventData: event }
                });
            } else {
                Pipeline.execute('Mail-SecureSend', {
                    MailSubject: 'Notification mail',
                    MailTo: mailTo,
                    MailFrom: kount.getNotificationEmail(),
                    MailTemplate: 'mail/riskChange',
                    EventData: event
                });
            }
        }
    },
    Error: function (orderNo) {
        return kount.writeExecutionError(new Error('KOUNT: K_ENS.js: EventHub: Order with number - ' + orderNo + ' not found'), 'KountEventHub', 'error');
    }
};

module.exports = Hub;
