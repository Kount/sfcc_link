/**
 * Kount 360 Order Model Helper
 * Builds request model for Kount 360 Orders endpoint based on SFCC Order object.
 * Safety checks and try/catch blocks included for sensitive logic.
 */

'use strict';

var Logger = require('dw/system/Logger').getLogger('kount-360', 'order-model');

/**
 * Get customer account data for Salesforce order
 * @param {dw.order.Order} order - Requested order object
 * @returns {Object} - Account details
 */
function getAccountData(order) {
    var profile = order.customer && order.customer.profile ? order.customer.profile : null;

    return {
        id: (profile && profile.customerNo) || '',
        type: profile && profile.customerNo ? 'REGISTERED' : 'GUEST',
        creationDateTime: profile && profile.creationDate ? profile.creationDate.toISOString() : '',
        username: (profile && profile.email) || ''
    };
}
/**
 * Get Order items to be used for Kount 360 API request
 * @param {dw.order.Order} order - Requested order
 * @returns {Array} - Kount Items
 */
function getKountItems(order) {
    var items = [];
    try {
        var URLUtils = require('dw/web/URLUtils');
        var pliIter = order.productLineItems && order.productLineItems.iterator ? order.productLineItems.iterator() : null;
        while (pliIter && pliIter.hasNext()) {
            var pli = pliIter.next();
            if (pli) {
                items.push({
                    upc: pli.product && pli.product.UPC ? pli.product.UPC : '',
                    price: pli.adjustedPrice ? pli.adjustedPrice.multiply(100).value : null,
                    name: pli.productName || '',
                    quantity: pli.quantityValue || 1,
                    description: pli.lineItemText || '',
                    sku: pli.productID || '',
                    category: pli.product && pli.product.primaryCategory ? pli.product.primaryCategory.ID : '',
                    brand: pli.product && pli.product.brand ? pli.product.brand : '',
                    url: URLUtils.https('Product-Show', 'pid', pli.productID).toString(),
                    physicalAttributes: {
                        size: pli.product && pli.product.custom.size ? pli.product.custom.size : '',
                        color: pli.product && pli.product.custom.color ? pli.product.custom.color : ''
                    }
                });
            }
        }
    } catch (e) {
        Logger.error('Error in Kount 360 Order Model Items: {0} {1}', e.message, e.stack);
    }

    return items;
}

/**
 * Get Items
 * @param {dw.order} order - Order
 * @returns {Array} - Items
 */
function getItems(order) {
    var arr = [];
    var it = order.productLineItems.iterator();
    while (it.hasNext()) {
        var pli = it.next();
        arr.push({ id: pli.productID || '', quantity: pli.quantityValue || 1 });
    }
    return arr;
}

/**
 * Get Kount 360 order fulfilment
 * @param {dw.order.Order} order - Requested order
 * @returns {Array} - Fulfilment Details
 */
function getFulfillment(order) {
    var Order = require('dw/order/Order');
    var fulfillments = [];
    var shippingTypeMap = { Foreign: 'LOCAL_DELIVERY', Overnight: 'LOCAL_DELIVERY', '2-Day Express': 'LOCAL_DELIVERY', Ground: 'LOCAL_DELIVERY', Express: 'LOCAL_DELIVERY', USPS: 'LOCAL_DELIVERY', 'Super Saver': 'LOCAL_DELIVERY', Delivery: 'LOCAL_DELIVERY', 'Pick-Up': 'STORE_PICK_UP' };
    var shippingMethodTypeMap = { Foreign: 'STANDARD', Overnight: 'NEXT_DAY', '2-Day Express': 'SECOND_DAY', Ground: 'STANDARD', Express: 'EXPRESS', USPS: 'STANDARD', 'Super Saver': 'STANDARD', Delivery: 'STANDARD', 'Pick-Up': 'STANDARD' };
    try {
        var shipments = order.shipments || [];
        for (var i = 0; i < shipments.length; i++) {
            var shipment = shipments[i];
            var shippingAddress = shipment.shippingAddress;
            var shippingMethod = shipment.shippingMethod ? shipment.shippingMethod.getDisplayName() : 'Ground';
            var shipmentType = shippingTypeMap[shippingMethod];
            var shippingMethodType = shippingMethodTypeMap[shippingMethod];
            var address = {
                line1: shippingAddress.address1 || '',
                line2: shippingAddress.address2 || '',
                city: shippingAddress.city || '',
                region: shippingAddress.stateCode || '',
                countryCode: shippingAddress.countryCode && shippingAddress.countryCode.value ? shippingAddress.countryCode.value : '',
                postalCode: shippingAddress.postalCode || ''
            };
            var fulfillment = {
                merchantFulfillmentId: shipment.ID || '',
                type: shipmentType,
                items: shipment.productLineItems ? shipment.productLineItems.toArray().map(function (pli) {
                    return { id: pli.productID || '', quantity: pli.quantityValue || 1 };
                }) : [],
                status: order.status.value !== Order.ORDER_STATUS_FAILED ? 'UNFULFILLED' : 'CANCELED',
                shipping: {
                    method: shippingMethodType,
                    amount: shipment.getAdjustedShippingTotalPrice() && shipment.getAdjustedShippingTotalPrice().available ? shipment.getAdjustedShippingTotalPrice().multiply(100).value : null
                },
                recipientPerson: shippingAddress ? {
                    name: {
                        first: shippingAddress.firstName || '',
                        family: shippingAddress.lastName || '',
                        prefix: shippingAddress.salutation || '',
                        suffix: shippingAddress.suffix || ''
                    },
                    emailAddress: order.customerEmail || '',
                    phoneNumber: shippingAddress.phone || ''
                } : null
            };
            var addressData = fulfillment.type === 'STORE_PICK_UP' ? {
                id: shipment.custom.fromStoreId || '',
                address: address
            } : address;

            fulfillment[fulfillment.type === 'STORE_PICK_UP' ? 'store' : 'address'] = addressData;
            fulfillments.push(fulfillment);
        }
    } catch (e) {
        Logger.error('Error in Kount 360 Order Model Fulfillment: {0} {1}', e.message, e.stack);
    }
    return fulfillments;
}

/**
 * Get Kount 360 Order transactions
 * @param {dw.order.Order} order - Requested order
 * @returns {Array} - transactions
 */
function getKountTransactions(order) {
    var Order = require('dw/order/Order');
    var transactions = [];
    try {
        var paymentInstruments = order.paymentInstruments || (order.getPaymentInstruments && order.getPaymentInstruments());
        if (paymentInstruments) {
            var piIter = paymentInstruments.iterator ? paymentInstruments.iterator() : null;
            while (piIter && piIter.hasNext()) {
                var pi = piIter.next();
                var transaction = pi.paymentTransaction;
                transactions.push({
                    merchantTransactionId: transaction.transactionID || '',
                    processor: transaction.paymentProcessor ? transaction.paymentProcessor.ID : '',
                    subtotal: order.adjustedMerchandizeTotalNetPrice && order.adjustedMerchandizeTotalNetPrice.available ? order.adjustedMerchandizeTotalNetPrice.multiply(100).value : null,
                    orderTotal: order.adjustedMerchandizeTotalPrice && order.adjustedMerchandizeTotalPrice.available ? order.adjustedMerchandizeTotalPrice.multiply(100).value : null,
                    currency: order.currencyCode || '',
                    tax: {
                        isTaxable: order.totalTax && order.totalTax.available ? order.totalTax.value > 0 : false,
                        taxableCountryCode: order.billingAddress && order.billingAddress.countryCode && order.billingAddress.countryCode.value ? order.billingAddress.countryCode.value : '',
                        taxAmount: order.totalTax && order.totalTax.available ? order.totalTax.multiply(100).value : null
                    },
                    items: order.productLineItems && order.productLineItems.iterator ? getItems(order) : [],
                    billedPerson: order.billingAddress ? {
                        name: {
                            first: order.billingAddress.firstName || '',
                            family: order.billingAddress.lastName || '',
                            prefix: order.billingAddress.salutation || '',
                            suffix: order.billingAddress.suffix || ''
                        },
                        emailAddress: order.customerEmail || '',
                        phoneNumber: order.billingAddress.phone || '',
                        address: {
                            line1: order.billingAddress.address1 || '',
                            line2: order.billingAddress.address2 || '',
                            city: order.billingAddress.city || '',
                            region: order.billingAddress.stateCode || '',
                            postalCode: order.billingAddress.postalCode || '',
                            countryCode: order.billingAddress.countryCode && order.billingAddress.countryCode.value ? order.billingAddress.countryCode.value : ''
                        }
                    } : null,
                    transactionStatus: order.status.value !== Order.ORDER_STATUS_FAILED ? 'AUTHORIZED' : 'REFUSED',
                    authorizationStatus: {
                        authResult: order.status.value !== Order.ORDER_STATUS_FAILED ? 'Approved' : 'Declined',
                        dateTime: order.creationDate ? order.creationDate.toISOString() : null,
                        processorTransactionId: transaction.transactionID || ''
                    }
                });
            }
        }
    } catch (e) {
        Logger.error('Error in Kount 360 Order Model Transactions: {0} {1}', e.message, e.stack);
    }
    return transactions;
}

/**
 * Builds kount360 Order api request using SFCC order data
 * @param {dw.order.order} order - Requested order
 * @returns {Object} requestData - Requested data object
 */
function buildkount360OrderRequest(order) {
    var Site = require('dw/system/Site');
    var currentSite = Site.getCurrent();
    var requestData = {};
    try {
        if (!order) {
            throw new Error('Order is required');
        }
        // Top-level fields
        requestData.merchantOrderId = order.orderNo || '';
        requestData.channel = currentSite && currentSite.ID.toUpperCase();
        // eslint-disable-next-line no-undef
        requestData.deviceSessionId = session.privacy.sessId || '';
        requestData.creationDateTime = order.creationDate ? order.creationDate.toISOString() : null;
        requestData.userIp = order.getRemoteHost() || '';

        // Account object
        requestData.account = getAccountData(order);

        // Items array
        requestData.items = getKountItems(order);

        // Fulfillment array
        requestData.fulfillment = getFulfillment(order);

        // Transactions array
        requestData.transactions = getKountTransactions(order);
    } catch (err) {
        Logger.error('Error in Kount 360 Order Model: {0} {1}', err.message, err.stack);
        requestData.error = err.message;
    }
    return requestData;
}

module.exports = {
    buildkount360OrderRequest: buildkount360OrderRequest
};

