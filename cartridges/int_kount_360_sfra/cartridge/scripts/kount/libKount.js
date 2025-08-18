'use strict';

var base = module.superModule || {};

var Site = require('dw/system/Site');

var kount360APIService = require('*/cartridge/scripts/services/kount360Service');
var kount360Mappings = require('*/cartridge/kount360mappings/index');

var basePostRISRequest = base.postRISRequest;
var basePostRiskCall = base.postRiskCall;

/**
 * @description Makes POST request. Sends orders details for evaluating
 * @param {Object} RequiredInquiryKeysVal Payload to send to Kount risk service
 * @returns {Object} Object parsed response or empty object (if an error occurred)
 */
function postRISRequest(RequiredInquiryKeysVal) {
    var OrderMgr = require('dw/order/OrderMgr');
    var currentSite = Site.getCurrent();
    var mappingUtils = require('*/cartridge/scripts/utils/mappingUtils');
    var kountOrderModel = require('*/cartridge/scripts/helpers/kount360OrderModel');
    var kountUtils = require('*/cartridge/scripts/utils/kountUtils');

    if (!currentSite.getCustomPreferenceValue('kount360Enabled') && basePostRISRequest) {
        return basePostRISRequest.call(this, RequiredInquiryKeysVal);
    }

    var errorState = {
        AUTO: 'F'
    };

    try {
        var order = OrderMgr.getOrder(RequiredInquiryKeysVal.ORDR);
        if (!order) {
            return errorState;
        }

        var orderModel = kountOrderModel.buildkount360OrderRequest(order);
        var inquirySource = mappingUtils.applyCustomMapping(RequiredInquiryKeysVal, kount360Mappings.kount360ReqValueMapping);
        var requestBody = mappingUtils.transform(kount360Mappings.kount360ReqMapping, inquirySource);
        var extendedOrderModel = orderModel.error || RequiredInquiryKeysVal.MODE === 'U' ? requestBody : kountUtils.extend(requestBody, orderModel);
        var response = kount360APIService.call({
            requestBody: extendedOrderModel,
            params: {
                riskInquiry: RequiredInquiryKeysVal.MODE !== 'U' ? 'true' : 'false'
            },
            pathParam: RequiredInquiryKeysVal.MODE === 'U' ? RequiredInquiryKeysVal.TRAN : null,
            method: RequiredInquiryKeysVal.MODE === 'U' ? 'PATCH' : 'POST'
        });

        if (!response || response.error) {
            return errorState;
        }

        if (response && response.ok) {
            var responseBody = mappingUtils.transform(kount360Mappings.kount360ResMapping, JSON.parse(response.object), false, true);
            var result = mappingUtils.applyCustomMapping(responseBody, kount360Mappings.kount360ResValueMapping);
            return result;
        }
    } catch (e) {
        var Logger = require('dw/system/Logger').getLogger('kount-360', 'risk-inquiry');
        Logger.error('Error in Kount 360 Risk Inquiry call: {0} {1}', e.message, e.stack);
    }

    return errorState;
}

/**
 * @description Run RISK workflow. Triggered by COBilling controller
 * @param {Function} paymentCallback Function that runs handlePayments
 * @param {Order} order Order Object
 * @param {boolean} isSfra Whether to use SFRA mode
 * @returns {Object} result of risk call
 */
function postRiskCall(paymentCallback, order, isSfra) {
    var result = basePostRiskCall ? basePostRiskCall.call(this, paymentCallback, order, isSfra) : null;
    // Send failed orders due to payment to Kount 360
    if (result && result.error && !result.KountOrderStatus) {
        var kountOrderModel = require('*/cartridge/scripts/helpers/kount360OrderModel');
        var requestBody = kountOrderModel.buildkount360OrderRequest(order);
        if (!requestBody.error) {
            kount360APIService.call({
                requestBody: requestBody,
                params: {
                    riskInquiry: false
                },
                pathParam: order.custom.kount_TRAN ? order.custom.kount_TRAN : null,
                method: order.custom.kount_TRAN ? 'PATCH' : 'POST'
            });
        }
    }

    return result;
}

base.postRISRequest = postRISRequest;
base.postRiskCall = postRiskCall;

module.exports = base;
