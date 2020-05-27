
'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Order = require('dw/order/Order');
var Transaction = require('dw/system/Transaction');
var Status = require('dw/system/Status');
var StringUtils = require('dw/util/StringUtils');
var Site = require('dw/system/Site');
var logger = require('dw/system/Logger').getLogger('kount', '');

/**
 * Iterates over Orders with kount retry status and
 * makes kount Post RIS Request and saves kount data into Order
 *
 * @param {dw.util.HashMap} args - the arguments
 * @returns {dw.system.Status} status object
 */
function execute(args) { // eslint-disable-line
    var RiskService = require('*/cartridge/scripts/kount/postRiskInqueryService');
    var UpdateOrder = require('*/cartridge/scripts/kount/updateOrder');
    var kount = require('*/cartridge/scripts/kount/libKount');
    try {
        var maxOrderRetries = Site.current.getCustomPreferenceValue('kount_OrderMaxRetries');
        var queryStr = 'custom.kount_Status={0} AND exportStatus={1}';
        if (maxOrderRetries) {
            queryStr += ' AND (custom.kount_Retries < {2} OR custom.kount_Retries={3})';
        }
        var orders = OrderMgr.queryOrders(queryStr, null, 'RETRY', Order.EXPORT_STATUS_NOTEXPORTED, maxOrderRetries, null);
        logger.info(StringUtils.format('orders with kount retry status found: {0}', orders.count));
        while (orders.hasNext()) {
            var order = orders.next();
            var orderNo = order.orderNo;
            var sessionId = order.custom.kount_SessionId;
            logger.info(StringUtils.format('kount retry process for order {0} start', orderNo));
            if (!order.remoteHost) {
                logger.info(StringUtils.format('order {0} was skipped, missing remoteHost for order', orderNo));
                continue; // eslint-disable-line
            }
            if (!sessionId) {
                logger.info(StringUtils.format('order {0} was skipped, missing kount_SessionId for order', orderNo));
                continue; // eslint-disable-line
            }
            var requestMock = {
                httpRemoteAddress: order.remoteHost
            };
            var hashedCCNumber = order.custom.kount_KHash;
            var paymentInstruments = order.paymentInstruments.iterator();
            var paymentInstrument = paymentInstruments.next();

            if (!hashedCCNumber) {
                logger.info(StringUtils.format('order {0} was skipped, hashedCCNumber was not found', orderNo));
                continue; // eslint-disable-line
            }

            if (!paymentInstrument) {
                logger.info(StringUtils.format('order {0} was skipped, paymentInstrument was not found', orderNo));
                continue; // eslint-disable-line
            }

            var paymentType = paymentInstrument.paymentMethod;
            var last4 = (paymentInstrument && paymentInstrument.creditCardNumberLastDigits) || '';

            var serviceData = {
                SessionID: sessionId,
                Email: order.customerEmail,
                PaymentType: paymentType,
                CreditCard: {
                    HashedCardNumber: hashedCCNumber,
                    Last4: last4
                },
                CurrentRequest: requestMock,
                Order: order,
                OrderID: orderNo
            };

            var riskResult = RiskService.init(serviceData);
            var kountStatus = riskResult.KountOrderStatus;
            UpdateOrder.init(order, riskResult, hashedCCNumber, sessionId);
            logger.info(StringUtils.format('{0} order was updated with kount status {1}', orderNo, kountStatus));
            Transaction.wrap(function () { // eslint-disable-line
                if (kountStatus === 'APPROVED') {
                    try {
                        var placeOrderStatus = OrderMgr.placeOrder(order);
                        if (placeOrderStatus === Status.ERROR) {
                            throw new Error();
                        }
                        logger.info(StringUtils.format('{0} order was placed based on kount {1} response', orderNo, kountStatus));
                    } catch (e) {
                        logger.error(StringUtils.format('Error trying to place order {0}: {1}', orderNo, e.message));
                    }
                    order.setExportStatus(Order.EXPORT_STATUS_READY);
                    order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                    try {
                        if (kount.isSFRA()) {
                            var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
                            COHelpers.sendConfirmationEmail(order, request.locale.id); // eslint-disable-line
                        } else {
                            var controllersApp = require('*/cartridge/scripts/app');
                            var Resource = require('dw/web/Resource');
                            var EmailModel = controllersApp.getModel('Email');
                            EmailModel.sendMail({
                                template: 'mail/orderconfirmation',
                                recipient: order.getCustomerEmail(),
                                subject: Resource.msg('order.orderconfirmation-email.001', 'order', null),
                                context: {
                                    Order: order
                                }
                            });
                        }
                    } catch (e) {
                        logger.error(StringUtils.format('Error trying to send confirmation email for order {0}: {1}', orderNo, e.message));
                    }
                } else if (kountStatus === 'DECLINED') {
                    try {
                        var failOrderStatus = OrderMgr.failOrder(order);
                        if (failOrderStatus === Status.ERROR) {
                            throw new Error();
                        }
                        logger.info(StringUtils.format('{0} order was failed based on kount {1} response', orderNo, kountStatus));
                    } catch (e) {
                        logger.error(StringUtils.format('Error trying to fail order {0}: {1}', orderNo, e.message));
                    }
                } else if (kountStatus === 'RETRY') {
                    var kountRetriesValue = (order.custom.kount_Retries || 0) + 1;
                    order.custom.kount_Retries = kountRetriesValue;
                    try {
                        if (!maxOrderRetries || (maxOrderRetries && maxOrderRetries >= kountRetriesValue)) {
                            kount.sendEmailNotification(StringUtils.format('Kount retry call failed for {0} order. Kount retry attempt {1}', orderNo, order.custom.kount_Retries));
                        }
                    } catch (e) {
                        logger.error(StringUtils.format('Error trying to send kount notification email: {0}', e.message));
                    }
                }
            });
        }
    } catch (e) {
        var errorMessage = StringUtils.format('Error on kount retry call job: {0}', e.message);
        logger.error(errorMessage);
        return new Status(Status.ERROR, '500', errorMessage);
    }

    return new Status(Status.OK);
}

module.exports = {
    execute: execute
};
