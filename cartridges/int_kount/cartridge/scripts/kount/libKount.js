"use strict"

// API
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var Logger = require('dw/system/Logger').getLogger('kount', 'LibKount');
var Site = require('dw/system/Site').current;
var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var Mail = require('dw/net/Mail');
var ObjectAttributeDefinition = require('dw/object/ObjectAttributeDefinition');
var Resource = require('dw/web/Resource');
var StringUtils = require('dw/util/StringUtils');
var OrderMgr = require('dw/order/OrderMgr');
var Basket = require('dw/order/Basket');
var Transaction = require('dw/system/Transaction');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

// scripts
var constants = require('*/cartridge/scripts/kount/kountConstants');
var RiskService = require('*/cartridge/scripts/kount/postRiskInqueryService');
var UpdateOrder = require('*/cartridge/scripts/kount/updateOrder');
var KountUtils = require('*/cartridge/scripts/kount/kountUtils');
var kountService = require('*/cartridge/scripts/init/initKount');
var KHash = require('*/cartridge/scripts/kount/kHash');
var ipaddr = require('*/cartridge/scripts/kount/ipAddr');

// Constants
var authType = constants.RISK_WORKFLOW_TYPE;

function _getRISUrl(){
    return Site.getCustomPreferenceValue('kount_MODE').value == 'Test' ? constants.RIS_TEST_URL : constants.RIS_PRODUCTION_URL;
}

function _getWorkflowType() {
    return Site.getCustomPreferenceValue('kount_AUTH_TYPE');
}

function _getIPList(){
    return Site.getCustomPreferenceValue('kount_IPFilter') || "";
}

function _getHashSaltKey() {
    return Site.getCustomPreferenceValue('kount_HashSaltKey') || '';
}

function _clearSession() {
    session.privacy['kount_TRAN'] = null;
}

function _getNotificationEmailList(){
    return Site.getCustomPreferenceValue("kount_NotificationEmail") || [];
}

function _getAPIKey(){
    var kount_APIKey = Site.getCustomPreferenceValue('kount_APIKey');
    return Site.getCustomPreferenceValue('kount_APIKey');
}

function isKountEnabled(){
    return Site.getCustomPreferenceValue('kount_IsEnabled') ? true : false;
}

function getDCUrl(){
    return Site.getCustomPreferenceValue('kount_MODE').value == 'Test' ? constants.DC_TEST_URL : constants.DC_PRODUCTION_URL;
}

function getWebsiteID(){
    return Site.getCustomPreferenceValue('kount_WebsiteId') || "";
}

function getMerchantID(){
    return Site.getCustomPreferenceValue('kount_MerchantID') || "";
}

function isENSEnabled(){
    return Site.getCustomPreferenceValue('kount_ENS') ? true : false;
}

function getEmailList(){
    return Site.getCustomPreferenceValue('kount_EmailList') || "";
}

function isSFRA() {
    return Site.getCustomPreferenceValue('kount_isSFRA') ? true : false;
}

function getCoreScript(scriptName) {
    return require('*/cartridge/scripts/' + scriptName);
}

function getNotificationEmail() {
    return Resource.msg('kount.noemail','kount',null);
}

function isExampleVerificationsEnabled(){
    return Site.getCustomPreferenceValue('kount_ExampleVerificationsEnabled') ? true : false;
}

function filterIP(IP){
    var listIP = _getIPList(),
        status = false;

    if(listIP.indexOf(IP) != -1 ){
        status = true;
    }
    return status;
}

/**
 * @description Makes POST request. Sends orders details for evaluating
 * @param RequiredInquiryKeysVal : Object
 * @return Object parsed response or empty object (if an error occurred)
 */
function PostRISRequest(RequiredInquiryKeysVal){
    var	body = {},
        status = {},
        httpResult;

    kountService.setURL(_getRISUrl());
    kountService.addHeader("X-Kount-Api-Key", _getAPIKey());

    for (var key in RequiredInquiryKeysVal){
        try {
            var param = !empty(RequiredInquiryKeysVal[key]) ? RequiredInquiryKeysVal[key] : '';
            if(typeof param === 'object' && !empty(param)){
                if(key === 'UDF'){
                    for(var i=0; i<param.length; i++){
                        body[key+"["+param[i].label+"]" ] = param[i].value;
                    }
                } else if (key === 'UAGT'){
                    var i = 0;
                    for(var itemHeader in param){
                        //body[key+"["+itemHeader+"]"] = param.get(itemHeader);
                        body[key+"["+i+"]"] = itemHeader;
                        i++;
                    }
                }
                else {
                    for(var i=0; i<param.length; i++){
                        body[key+"["+i+"]"] = param[i];
                    }
                }
            } else if (!empty(param)){
                body[key] = param;
            }
        } catch (err){
            writeExecutionError(err, "PostRISRequest", "error");
            throw err;
        }
    }

    httpResult = kountService.call(body);
    if (httpResult.ok){
        status = httpResult.object;
        return status;
    } else {
        status = { AUTO: 'F' };
        writeExecutionError(httpResult.errorMessage, "PostRISRequest", "error");
        return status;
    }
}

/**
 * @description Add warning and error messages to log and returns Kount order status
 * Status APPROVED sents by-default if Kount response contains error messages
 *
 * @param params : Object response from Kount
 * @return String Kount status
 */
function evaluateRISResponse(params){
    var status = "APPROVED",
        responseCode = params['AUTO'],
        statusMap = { A : 'APPROVED', D : 'DECLINED', R : 'HOLD', E : 'HOLD', F: 'RETRY' };

    if('ERRO' in params){
        writeServiceError(params, "evaluateRISResponse", "ERROR_");
        if (params['MODE'] == 'E' && params['ERROR_COUNT'] == 1 && params['ERRO'] == 601) {
            status = 'RETRY';
        }
        return status;
    } else {
        if("WARNING_0" in params) {
            writeServiceError(params, "evaluateRISResponse", "WARNING_");
        }
        return statusMap[responseCode];
    }
}

/**
 *	@description Method that write ERRORs in execution
 *	@param {Error} Error object
 *	@param {String} Name of method
 *	@param {String} type of error
 */
function writeExecutionError (error, actionName, type) {
    var message = typeof error == "object" ? error.message : error,
        time = new Date().toISOString(),
        actionName = actionName || 'Exception';

    switch(type){
        case "error":
            var errorString = Resource.msgf("error.exeption", "error", null, actionName, 'ERROR', message).replace(new RegExp(/(?!<\")\/[^]+\/(?!\")/g), "");
            Logger.error(errorString, "");
            if (!empty(_getNotificationEmailList())) {
                sendEmailNotification(errorString);
            } else {
                writeExecutionError(new Error("Email List is empty"), "writeExecutionError", "warn");
            }
            break;
        case "warn":
            var errorString = Resource.msgf("error.exeption", "error", null, actionName, 'WARN', message);
            Logger.warn(errorString, "");
            break;
        default:
            var errorString = Resource.msgf("error.exeption", "error", null, actionName, 'INFO', message).replace(new RegExp(/(?!<\")\/[^]+\/(?!\")/g), "");
            Logger.info(errorString, "");
    }

}

/**
 *	@description Method that write response ERRORs
 *	@param {Object} Response from request
 *	@param {String} Name of method
 *	@param {String} Type of error
 */
function writeServiceError(response, method, type){
    var errorParam = type + "COUNT",
        errorArray = [];
    if(!empty(response) && errorParam in response){
        var count =  response[errorParam];
        for (var  i = 0; i < count; i++){
            var errorNumber = type + i;
            if (errorNumber in response) {
                errorArray.push(response[errorNumber]);
            }
        }
        switch(type){
            case "ERROR_":
                writeExecutionError(new Error(errorArray.join(";")), method, "error");
                break;
            case "WARNING_":
                writeExecutionError(new Error(errorArray.join(";")), method, "warn");
                break;
        }
    }
}
/**
 *	@description Method that write responses ERRORs
 *	@param {Stirng} Response from request
 *	@return {Boolean} Show status if it is a plain text response
 */
function plainTextHandler(response){
    var status = true;
    if (response.indexOf("\n") != -1){
        var responseArray = response.split("\n"),
            errorArray = [];
        for (var i = 0; i < responseArray.length-1; i++){
            if(responseArray[i].indexOf("ERROR_") != -1 && responseArray[i].indexOf("ERROR_COUNT") == -1){
                errorArray.push(responseArray[i]);
            }
        }
        writeExecutionError(new Error(errorArray.join(";")), "plainTextHandler", "error");
    } else {
        status = false;
    }

    return status;
}

/**
 *	@description Method that send email notification about errors
 *	@param {String} Error message
 */
function sendEmailNotification(msg){
    var template = new Template("mail/errorNotification"),
        templateMap = new HashMap(),
        mailMsg = new Mail(),
        siteName = Site.getName();

    templateMap.put("ErrorName", "Error during execution");
    templateMap.put("SiteName", siteName);
    templateMap.put("ErrorDescription", msg);

    mailMsg.addTo(_getNotificationEmailList().join(","));
    mailMsg.setFrom("noreply@kount.net");
    mailMsg.setSubject("Error during execution");
    mailMsg.setContent(template.render(templateMap));

    mailMsg.send();
}

/**
 *	@description Method creates UDF fields for request
 *	@param {Order} Order
 *	@return {Array} return UDF array with structure lable : value
 */
function getUDFFields(order){
    var fields = Site.getCurrent().getCustomPreferenceValue("kount_UDF") || [],
        UDF = [],
        UDFMap = getUDFObjectMap(order);

    try {
        if (!empty(fields)){
            for(let i = 0;i < fields.length;i++){
                var field = fields[i].split("|");

                field[0] = StringUtils.trim(field[0]);
                field[1] = StringUtils.trim(field[1]).split(".");
                if(!empty(field[1][1])){
                    var mapObject = UDFMap.get(field[1][0].toLowerCase()),
                        value = !empty(mapObject) ? getUDFFieldValue(mapObject.meta, mapObject.object, field[1][1]) : "";
                    if(!empty(value)){
                        UDF.push({
                            "label" : field[0],
                            "value" : value
                        });
                    }
                } else {
                    writeExecutionError(new Error("UDF field doesn't setup correctly: " +  fields[i]),"getUDFFields", "error");
                }
            }
        }
    } catch(e){
        writeExecutionError(e,"getUDFFields", "error");
    }
    return UDF;
}

function preRiskCall(basket, callback, isSfra) {
    var data = basket.constructor == Basket ? basket : basket.object;
    if(isKountEnabled() && authType == constants.RISK_WORKFLOW_TYPE_PRE) {
        try {
            var result = PostRIS(data, isSfra);
            if(!empty(result.KountOrderStatus) && result.KountOrderStatus == "DECLINED") {
                if (callback) {	// sfra doesn't need callback
                    callback({
                        KountOrderStatus: result.KountOrderStatus,
                        order_created: false
                    });
                }
                return result;
            } else {
                session.privacy['kount_TRAN'] = result.responseRIS && result.responseRIS.TRAN;
                return result;
            }
        } catch (e) {
            Logger.error("ERROR: " + e.message + "\n" + e.stack);
            writeExecutionError(String(e.stack), "preRiskCall", "error");
        }
    }
}
/**
 * @description Simulate address verification and card verification
 * @param order
 * @returns {void}
 */
function simulateVerifications(order) {
    if (isExampleVerificationsEnabled()) {
        Transaction.wrap(function() {
            order.custom.kount_AVST = request.httpParameterMap.kountTestAVST ? request.httpParameterMap.kountTestAVST.value : 'X';
            order.custom.kount_AVSZ = request.httpParameterMap.kountTestAVSZ ? request.httpParameterMap.kountTestAVSZ.value : 'X';
            order.custom.kount_CVVR = request.httpParameterMap.kountTestCVVR ? request.httpParameterMap.kountTestCVVR.value : 'X';
        });
    }
}
/**
 * @description Run RISK workflow. Triggered by COBilling controller
 * @param paymentCallback
 * @param order
 * @param isSfra
 * @param COBillingController
 * @returns {object}
 */
function postRiskCall(paymentCallback, order, isSfra) {
    if (isKountEnabled()) {
        simulateVerifications(order);
        var handleCallResult = function (result) {
            if (!empty(result.KountOrderStatus) && result.KountOrderStatus == "DECLINED") {
                Transaction.wrap(function() {
                    OrderMgr.failOrder(order);
                })

                return {
                    KountOrderStatus: result.KountOrderStatus,
                    error: true
                };
            } else {
                return result;
            }
        };
        var orderNo = isSfra ? order.orderNo : undefined;
        var paymentResult = paymentCallback(order, orderNo);
        var params;
        if (paymentResult && paymentResult.error) {
            params = KountUtils.extend({}, paymentResult);
        } else {
            params = KountUtils.extend(PostRIS(order, isSfra), paymentResult);
        }
        var result = handleCallResult(params);
        // clear session variable "TRAN" for "PRE" auth.
        _clearSession();
        return result;
    } else {
        writeExecutionError(new Error("KOUNT: K.js: Kount is not enabled"), "PostRIS", "info");
        _clearSession();
        return paymentCallback(order);
    }
}

/**
 * @description Call Kount with data from DataCollector and custom order data
 * @param Order
 * @returns {*}
 * @constructor
 */
function PostRIS(Order, isSfra) {
    var serviceData = {}
    var hashedCCNumber = '';
    if (isSfra) {
        // get credit card number from billing form
        var creditCardNumber = session.forms.billing.creditCardFields.cardNumber.value;
        var last4 = '';
        
        if (session.customer.authenticated
            && (null == creditCardNumber)	// if using saved credit card
            && Order.custom.kount_KHash		// and hash is already in order custom attribute
        ) {
            hashedCCNumber = Order.custom.kount_KHash;	// use saved hash
            var paymentInstruments = session.customer.profile.wallet.paymentInstruments;
            var array = require('*/cartridge/scripts/util/array');
            var paymentInstrument = array.find(paymentInstruments, function (item) {
                return hashedCCNumber === item.custom.kount_KHash;
            });
            last4 = paymentInstrument ? paymentInstrument.creditCardNumber.substr(paymentInstrument.creditCardNumber.length - 4) : '';
        } else {
            last4 = creditCardNumber.substr(creditCardNumber.length - 4);
            hashedCCNumber = KHash.hashPaymentToken(creditCardNumber);	// else hash CC number from form
        }
        // set serviceData
        serviceData = {
            'SessionID': session.privacy.sessId,
            'Email': Order.customerEmail,
            'PaymentType': session.forms.billing.paymentMethod.value,
            'CreditCard': {
                'HashedCardNumber': hashedCCNumber,
                'Last4': last4
            },
            'CurrentRequest': request,
            'Order': Order,
            'OrderID': Order.constructor != Basket ? Order.orderNo : null
        }
    } else {
        var creditCardNumber = session.forms.billing.paymentMethods.creditCard.number.value;
        var last4 = creditCardNumber ? creditCardNumber.substr(creditCardNumber.length - 4) : '';
        hashedCCNumber = KHash.hashPaymentToken(creditCardNumber);	// hash CC number from form
        serviceData = {
            'SessionID': session.privacy.sessId,
            'Email': session.forms.billing.billingAddress.email.emailAddress.htmlValue,
            'PaymentType': session.forms.billing.paymentMethods.selectedPaymentMethodID.htmlValue,
            'CreditCard': {
                'HashedCardNumber': hashedCCNumber,
                'Last4': last4
            },
            'CurrentRequest': request,
            'Order': Order,
            'OrderID': Order.constructor != Basket ? Order.orderNo : null
        }
    }
    var riskResult = RiskService.init(serviceData);

    UpdateOrder.init(Order, riskResult, hashedCCNumber, session.privacy.sessId);

    return riskResult;
}

/**
 *	@description Method creates UDF fields for request
 *	@param {Object} Described object
 *	@param {String} Attributes name
 * 	@return {Object}
 */
function getUDFFieldValue (meta, object, propertyName){
    var attribute = meta.getSystemAttributeDefinition(propertyName) || meta.getCustomAttributeDefinition(propertyName),
        value = "";

    if (!empty(attribute)){
        switch (attribute.valueTypeCode) {
            case ObjectAttributeDefinition.VALUE_TYPE_DATE:
                value = getUDFValue(attribute, object, propertyName);
                if(!empty(value)){
                    value = StringUtils.formatCalendar(new Calendar(value), "yyyy-MM-dd");
                } else {
                    value = "";
                }

                break;
            case ObjectAttributeDefinition.VALUE_TYPE_DATETIME:
                value = getUDFValue(attribute, object, propertyName);
                if(!empty(value)){
                    value = StringUtils.formatCalendar(new Calendar(value), "yyyy-MM-dd");
                } else {
                    value = "";
                }
                break;
            case ObjectAttributeDefinition.VALUE_TYPE_BOOLEAN:
                break;
            case ObjectAttributeDefinition.VALUE_TYPE_PASSWORD:
                break;
            default:
                value = getUDFValue(attribute, object, propertyName);
                if(empty(value)){
                    value = "";
                }
        }
    }
    return value;
}

/**
 *	@description Method creates UDF fields for request
 *	@param {Object} Order
 *	@return {String} value of attribute
 */
function getUDFValue(attribute, object, propertyName){
    if (!attribute.multiValueType && attribute.system) {
        return object[propertyName];
    } else if (!attribute.multiValueType && !attribute.system) {
        return object.custom[propertyName];
    } else {
        return null
    }
}

/**
 *	@description Method creates UDF fields for request
 *	@param {Order} Order
 *	@return {HashMap} mapped object for UDF
 */
function getUDFObjectMap(order){
    var UDFMap = new HashMap(),
        shippingAddress = order.getDefaultShipment().getShippingAddress(),
        billingAddress = order.getBillingAddress(),
        profile = order.getCustomer().getProfile();

    UDFMap.put("shippingaddress", {
        // fix for gift certificate purchase
        "meta" : shippingAddress ? shippingAddress.describe() : '',
        "object" : shippingAddress
    });
    UDFMap.put("billingaddress", {
        "meta" : billingAddress.describe(),
        "object" : billingAddress
    });
    !empty(profile) ? UDFMap.put("profile", {
            "meta" : profile.describe(),
            "object" : profile
        }) : null;
    UDFMap.put("order", {
        "meta" : order.describe(),
        "object" : order
    });

    return UDFMap;
}

/**
 *	@description Method creates UDF fields for request
 *	@param {Collection} Order
 *	@return {Payment} First Payment method
 */
function getPayment(payments) {
    if (payments.length > 1) {
        var iterator = payments.iterator();
        while(!empty(iterator) && iterator.hasNext()){
            var payment = iterator.next();

            //Kount doesn't support multipayments so only first acceptable will be used
            if("CREDIT_CARD" == payment.getPaymentMethod() || "PayPal" == payment.getPaymentMethod() || "GIFT_CERTIFICATE" == payment.getPaymentMethod()){
                return payment;
            }
        }
        return payment;
    } else {
        return !empty(payments) ? payments[0] : false;
    }
}

function getSessionIframe(sessionIframe, basketUUID) {
    var sessionId = sessionIframe.substr(0,24).replace('-','_','g') + basketUUID.substr(0,8).replace('-','_','g');
    session.privacy['sessId'] = sessionId;
    return sessionId;
}

function queueENSEventsForProcessing(requestBody) {
    try {
        var result = KountUtils.parseEnsXMLtoObject(requestBody);
        Transaction.wrap(function () {
            var ensRecord = CustomObjectMgr.createCustomObject('KountENSQueue', require('dw/util/UUIDUtils').createUUID());
            ensRecord.custom.ensResponseBody = JSON.stringify(result);
        });
    } catch (e) {
        Logger.error("ERROR: " + e.message + "\n" + e.stack);
        writeExecutionError(new Error("KOUNT: K_ENS.js: Error when parsing ENS xml"), "EventClassifications", "error");
        throw e;
    }
}

function validateIpAddress(ip) {
    var ipRange = Site.getCustomPreferenceValue('kount_IP_RANGE');
    if (!ipRange) {
        return true;
    }
    try {
        var ip = ipaddr.parse(ip);
        var ranges = ipRange.split(',');
        return ranges.some(function(range) {
            return ip.match(ipaddr.parseCIDR(range));
        });
    } catch (e) {
        Logger.error("Error parsing Kount IP Range for ENS filtering: " + e.message + '\n' + e.stack);
        return false;
    }
}

module.exports = {
    filterIP: filterIP,
    PostRISRequest: PostRISRequest,
    evaluateRISResponse: evaluateRISResponse,
    writeExecutionError: writeExecutionError,
    writeServiceError: writeServiceError,
    plainTextHandler: plainTextHandler,
    sendEmailNotification: sendEmailNotification,
    getUDFFields: getUDFFields,
    preRiskCall: preRiskCall,
    simulateVerifications: simulateVerifications,
    postRiskCall: postRiskCall,
    PostRIS: PostRIS,
    getUDFFieldValue: getUDFFieldValue,
    getUDFValue: getUDFValue,
    getUDFObjectMap: getUDFObjectMap,
    getPayment: getPayment,
    getSessionIframe: getSessionIframe,
    isSFRA: isSFRA,
    getCoreScript: getCoreScript,
    getNotificationEmail: getNotificationEmail,
    getEmailList: getEmailList,
    getMerchantID: getMerchantID,
    getWebsiteID: getWebsiteID,
    isKountEnabled: isKountEnabled,
    getDCUrl: getDCUrl,
    isENSEnabled: isENSEnabled,
    isExampleVerificationsEnabled: isExampleVerificationsEnabled,
    queueENSEventsForProcessing: queueENSEventsForProcessing,
    validateIpAddress: validateIpAddress
};