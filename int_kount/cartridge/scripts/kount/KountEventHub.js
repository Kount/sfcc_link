"use strict"

// API
var OrderMgr = require('dw/order/OrderMgr');
var Site = require('dw/system/Site').current;
var Order = require('dw/order/Order');
var Resource = require('dw/web/Resource');
var Pipeline = require('dw/system/Pipeline');
var Transaction = require('dw/system/Transaction');

// Scripts
var AttrUpdater = require('./UpdateCustomAttribute');
var StatusUpdater = require('./UpdateOrderStatus');
var ProductInventory = require('./CheckProductInventory');

// Tools
var kount = require('~/cartridge/scripts/kount/LibKount');

// Core APP
//var controllersApp = kount._getCoreScript('app') || {getModel: function(){}};

// Const
var constants = require('./KountConstants');

// Models
// var EmailModel = controllersApp.getModel('Email');
// var OrderModel = controllersApp.getModel('Order');

/**
 * @description Hub for ENS events.
 * @type {{WORKFLOW_STATUS_EDIT: Hub.'WORKFLOW_STATUS_EDIT', WORKFLOW_REEVALUATE: Hub.'WORKFLOW_REEVALUATE', WORKFLOW_NOTES_ADD: Hub.'WORKFLOW_NOTES_ADD', RISK_CHANGE: Hub.'RISK_CHANGE', proceedOrder: Hub.'proceedOrder', failOrder: Hub.'failOrder', createGiftCertificates: Hub.'createGiftCertificates', sendMail: Hub.'sendMail', sendRiskMail: Hub.'sendRiskMail', Error: Hub.'Error'}}
 */
var Hub = {
    'WORKFLOW_STATUS_EDIT': function (event) {
        var order = OrderMgr.getOrder(event.orderNo);

        if(!order) return Hub.Error(event.orderNo);

        StatusUpdater.update(event.newValue, order);
        var result = AttrUpdater.update(event, 'Status', order);

        Hub.sendRiskMail(result.mailTo, event);
        Hub.proceedOrder(result, order);
    },
    'WORKFLOW_REEVALUATE': function(event) {
        return Hub.sendRiskMail(AttrUpdater.update(event, 'SCOR', OrderMgr.getOrder(event.orderNo)).mailTo, event);
    },
    'WORKFLOW_NOTES_ADD': function (event) {
        return Hub.sendRiskMail(AttrUpdater.update(event, 'REASON_CODE', OrderMgr.getOrder(event.orderNo)).mailTo, event);
    },
    'RISK_CHANGE': function (event) {
        if(constants.ALLOWED_RISK_PARAMS.indexOf(event.attributeName) != -1) {
            return Hub.sendRiskMail(AttrUpdater.update(event, event.attributeName, OrderMgr.getOrder(event.orderNo)).mailTo, event);
        }
    },
    'proceedOrder': function(orderDetails, order) {
        if(orderDetails.orderStatus == 'StatusDECLINED') {
            Hub.failOrder(order);
        } else if(orderDetails.orderStatus == 'StatusAPPROVED') {
            ProductInventory.check(order, function (inventoryExist) {
                if(inventoryExist) {
                    Hub.createGiftCertificates(order);
                    Hub.sendMail(
                        "mail/orderconfirmation",
                        order.customerEmail,
                        Resource.msg('order.orderconfirmation-email.001','order',null)+ " " + order.orderNo,
                        { Order: order }
                    )
                } else {
                    Hub.failOrder(order);
                }
            });
        }
    },
    'failOrder': function(order) {
        Transaction.wrap(function() {
            return OrderMgr.failOrder(order);
        })
    },
    'createGiftCertificates': function (order) {
        var gc;
        if(OrderModel) {
            gc = OrderModel.get(order).createGiftCertificates();
        } else {
            gc = Pipeline.execute('COPlaceOrder-CreateGiftCertificates', {
                Order:  order
            });
        }
        if(gc) {
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
    'sendMail': function (template, recipient, subject, data) {
        if(EmailModel) {
            EmailModel.get(template, recipient)
                .setSubject(subject)
                .send(data);
        } else {
            Pipeline.execute('Mail-SecureSend', {
                MailSubject: subject,
                MailTo: recipient,
                MailFrom: kount._getNotificationEmail(),
                MailTemplate: template
            });
        }
    },
    'sendRiskMail': function (mailTo, event) {
        if(!empty(event) && Site.getCustomPreferenceValue('kount_RISK_CHANGE_'+event.attributeName)) {
            if (EmailModel) {
                EmailModel.get("mail/risk_change", mailTo)
                    .setSubject("Notification mail")
                    .setFrom(kount._getNotificationEmail())
                    .send({EventData: event});
            } else {
                Pipeline.execute('Mail-SecureSend', {
                    MailSubject: "Notification mail",
                    MailTo: mailTo,
                    MailFrom: kount._getNotificationEmail(),
                    MailTemplate: "mail/risk_change",
                    EventData: event
                });
            }
        }
    },
    'Error': function(orderNo) {
        return kount.writeExecutionError(new Error("KOUNT: K_ENS.js: EventHub: Order with number - "+orderNo+" not found"), "KountEventHub", "error");
    }
};

module.exports = Hub;