/* global empty session */
'use strict';

// API
var Site = require('dw/system/Site');
var Resource = require('dw/web/Resource');
var Encoding = require('dw/crypto/Encoding');

// scripts
var constants = require('*/cartridge/scripts/kount/kountConstants');

var responseArgs = {
    KountOrderStatus: '',
    responseRIS: ''
};

/**
 * @dewscription Initialises call to Kount service
 * @param {Object} args {{
    'SessionID': String,
    'Email': String,
    'CardNumber': Number,
    'CurrentRequest': Object,
    'Order': Object,
    'OrderID': String
  }}
 * @param {boolean} preRiskCall whether this is a pre risk call
 * @returns {Object} {{KountOrderStatus: string, responseRIS: string}}
 */
function init(args, preRiskCall) {
    var kount = require('*/cartridge/scripts/kount/libKount');
    var KHash = require('*/cartridge/scripts/kount/kHash');
    var request = args.CurrentRequest;
    var email = args.Email || Resource.msg('kount.noemail', 'kount', 'noemail@kount.com');
    var IP = request.httpRemoteAddress || '10.0.0.1';
    var sessID = args.SessionID || kount.getSessionIframe(session, args.Order.getUUID());
    var orderID = args.OrderID || null;
    var order = args.Order;
    var totalPrice = (order.getTotalGrossPrice().getValue() * 100).toFixed();
    var customer = order.getCustomer();
    var profile = customer.getProfile();
    var billingAddr = order.getBillingAddress();
    var customerID = !empty(profile) ? profile.getCustomerNo() : '';
    var customerName = !empty(profile) ? profile.getFirstName() + ' ' + profile.getSecondName() + ' ' + profile.getLastName() : billingAddr.getFullName();
    var customerEmail = !empty(profile) ? profile.getEmail() : email;
    var customerCreateDate = !empty(profile) ? Math.floor(profile.creationDate.valueOf() / 1000) : Math.floor((new Date()).valueOf() / 1000);
    var shippingTypeMap = { Foreign: 'SD', Overnight: 'ND', '2-Day Express': '2D', Ground: 'ST', Express: '2D', USPS: 'ST', 'Super Saver': 'ST' };
    var payInstrColl = order.getPaymentInstruments();
    var payInstr = kount.getPayment(payInstrColl);
    var creditCard = args.CreditCard;
    var paymentTypeMap = { BML: 'BLML', CREDIT_CARD: 'CARD', GIFT_CERTIFICATE: 'GIFT', PayPal: 'PYPL' };
    var paymentTokenMap = {
        BML: '',
        CREDIT_CARD: creditCard.HashedCardNumber,
        GIFT_CERTIFICATE: payInstr ? KHash.hashGiftCard(payInstr.getGiftCertificateCode()) : '',
        PayPal: payInstr && 'paypalPayerID' in payInstr.custom && !empty(payInstr.custom.paypalPayerID) ? KHash.hash(payInstr.custom.paypalPayerID) : ''
    };
    var paymentType = 'NONE';
    var paymentToken = null;
    var allProducts = order.allProductLineItems.iterator();
    var getGiftCertificateLineItems = order.getGiftCertificateLineItems().iterator();
    var ProdDescVals = [];
    var ProdItemVals = [];
    var ProdPriceVals = [];
    var ProdQuantVals = [];
    var ProdTypeVals = [];
    var shippStreet1 = '';
    var shippStreet2 = '';
    var shippCountry = '';
    var shippCity = '';
    var shippName = '';
    var shippPostalCode = '';
    var shippPhoneNumber = '';
    var shippState = '';
    var shippType = '';
    var prodType;
    var price;
    var shippMethod;

    // GiftCert
    while (getGiftCertificateLineItems.hasNext()) {
        var li = getGiftCertificateLineItems.next();
        if (li.getPriceValue() != 0) { //eslint-disable-line
            prodType = li.getLineItemText();
            price = (li.getBasePrice().getValue() * 100).toFixed();
            ProdDescVals.push(li.getLineItemText());
            ProdItemVals.push(li.getUUID()); // use UUID
            ProdPriceVals.push(price);
            ProdQuantVals.push(1);
            ProdTypeVals.push(prodType || 'Not Available');
        }
    }

    while (allProducts.hasNext()) {
        var pli = allProducts.next();
        if (pli.getPriceValue() != 0) { //eslint-disable-line
            prodType = !empty(pli.getCategory()) ? pli.getCategory().getDisplayName() : pli.getProductName();
            price = (pli.getBasePrice().getValue() * 100).toFixed();
            prodType = Encoding.toURI(prodType);
            ProdDescVals.push(Encoding.toURI(pli.getLineItemText()));
            ProdItemVals.push(pli.getProductID());
            ProdPriceVals.push(price);
            ProdQuantVals.push(pli.getQuantityValue());
            ProdTypeVals.push(prodType || 'Not Available');
        }
    }

    var payMethod = payInstr ? payInstr.getPaymentMethod() : args.PaymentType;

    // When gift certificate apply to order - payment method becomes GIFT and real payment info goes missing.
    // Need to send real billing info instead
    // args.PaymentType comes from session (checkbox of the one of the billing forms)
    if (payMethod == 'GIFT_CERTIFICATE' && args.PaymentType != 'GIFT_CERTIFICATE') { //eslint-disable-line
        payMethod = args.PaymentType;
    }

    if (payMethod in paymentTypeMap) {
        // paymentProcessor can be null in 'PRE' auth workflow
        var paymentTransactionID = payInstr ? payInstr.paymentTransaction.paymentProcessor && payInstr.paymentTransaction.paymentProcessor.ID : '';
        // integration of PayPal Direct Payment
        if (payMethod == 'CREDIT_CARD' && paymentTransactionID == 'PAYPAL_PAYMENTSPRO') { //eslint-disable-line
            paymentType = paymentTypeMap.CREDIT_CARD || paymentTypeMap.PayPal;
            paymentToken = paymentTokenMap.CREDIT_CARD || paymentTokenMap.PayPal;
        } else {
            paymentType = paymentTypeMap[payMethod];
            paymentToken = paymentTokenMap[payMethod];
        }
    }

    var shipments = order.getShipments();
    var iter = shipments.iterator();
    while (iter != null && iter.hasNext()) {
        var shipment = iter.next();
        var shippAddr = shipment.getShippingAddress();

        // In case of purchasing gift card with other products (giftCard always last in collection)
        // need to stop overwriting of real address
        if ((shippStreet1 && shippName && shippPostalCode && shippMethod) && !shippAddr) {
            break;
        }

        // needed for GC purchase, because GC checkout doesn't have ShippingAddress Object
        shippStreet1 = shippAddr ? shippAddr.getAddress1() : '';
        shippStreet2 = shippAddr ? shippAddr.getAddress2() : '';
        shippCountry = shippAddr && shippAddr.getCountryCode() ? shippAddr.getCountryCode().getValue() : '';
        shippCity = shippAddr ? shippAddr.getCity() : '';
        shippName = shippAddr ? shippAddr.getFullName() : '';
        shippPostalCode = shippAddr ? shippAddr.getPostalCode() : '';
        shippPhoneNumber = shippAddr ? shippAddr.getPhone() : '';
        shippState = shippAddr ? shippAddr.getStateCode() : '';

        try {
            shippMethod = shipment.getShippingMethod() ? shipment.getShippingMethod().getDisplayName() : '';
        } catch (err) {
            kount.writeExecutionError(err, 'PostRiskInqueryService.ds', 'error');
        }

        if (shippMethod in shippingTypeMap) {
            shippType = shippingTypeMap[shippMethod];
        }
    }
    var RequiredInquiryKeysVal;
    if (constants.RISK_WORKFLOW_TYPE === constants.RISK_WORKFLOW_TYPE_PRE && !preRiskCall && orderID && args.Order.custom.kount_Status.value !== 'RETRY') {
        RequiredInquiryKeysVal = {
            AUTH: Resource.msg('kount.AUTH', 'kount', null),
            AVST: constants.ALLOWED_VERIFICATION_VALUES.indexOf(order.custom.kount_AVST) > -1 ? order.custom.kount_AVST : 'X',
            AVSZ: constants.ALLOWED_VERIFICATION_VALUES.indexOf(order.custom.kount_AVSZ) > -1 ? order.custom.kount_AVSZ : 'X',
            CVVR: constants.ALLOWED_VERIFICATION_VALUES.indexOf(order.custom.kount_CVVR) > -1 ? order.custom.kount_CVVR : 'X',
            FRMT: Resource.msg('kount.FRMT', 'kount', 'JSON'),
            MACK: Resource.msg('kount.MACK', 'kount', 'Y'),
            MERC: kount.getMerchantID(),
            MODE: Resource.msg('kount.MODE_UPDATE', 'kount', 'U'),
            PTOK: paymentToken || null,
            SESS: sessID,
            ORDR: orderID,
            TRAN: session.privacy.kount_TRAN,
            VERS: Resource.msg('kount.VERS', 'kount', '0630')
        };
        if (payMethod == 'CREDIT_CARD') { //eslint-disable-line
            RequiredInquiryKeysVal.LAST4 = creditCard.Last4 || null;
        }
    } else {
        RequiredInquiryKeysVal = {
            AUTH: Resource.msg('kount.AUTH', 'kount', null), // For it need imported certificate to Bussiness Manager
            CURR: Site.getCurrent().getDefaultCurrency(),
            EMAL: customerEmail,
            IPAD: IP,
            MACK: Resource.msg('kount.MACK', 'kount', 'Y'),
            MERC: kount.getMerchantID(),
            MODE: Resource.msg('kount.MODE_INITIAL', 'kount', 'Q'),
            PROD_DESC: ProdDescVals,
            PROD_ITEM: ProdItemVals,
            PROD_PRICE: ProdPriceVals,
            PROD_QUANT: ProdQuantVals,
            PROD_TYPE: ProdTypeVals,
            PTOK: paymentToken || '',
            PTYP: paymentType,
            SESS: sessID,
            SITE: kount.getWebsiteID(),
            TOTL: totalPrice,
            VERS: Resource.msg('kount.VERS', 'kount', '0630'), // Provided by Kount
            // Optional keys
            AVST: constants.ALLOWED_VERIFICATION_VALUES.indexOf(order.custom.kount_AVST) > -1 ? order.custom.kount_AVST : 'X',
            AVSZ: constants.ALLOWED_VERIFICATION_VALUES.indexOf(order.custom.kount_AVSZ) > -1 ? order.custom.kount_AVSZ : 'X',
            B2A1: billingAddr.getAddress1(),
            B2A2: billingAddr.getAddress2(),
            B2CC: billingAddr.getCountryCode() && billingAddr.getCountryCode().getValue(),
            B2CI: billingAddr.getCity(),
            B2PC: billingAddr.getPostalCode(),
            B2PN: billingAddr.getPhone(),
            B2ST: billingAddr.getStateCode(),
            CASH: totalPrice,
            CVVR: constants.ALLOWED_VERIFICATION_VALUES.indexOf(order.custom.kount_CVVR) > -1 ? order.custom.kount_CVVR : 'X',
            NAME: customerName,
            FRMT: Resource.msg('kount.FRMT', 'kount', 'JSON'),
            ORDR: orderID,
            S2A1: shippStreet1,
            S2A2: shippStreet2,
            S2CC: shippCountry,
            S2CI: shippCity,
            S2EM: email,
            S2NM: shippName,
            S2PC: shippPostalCode,
            S2PN: shippPhoneNumber,
            S2ST: shippState,
            SHTP: shippType,
            UNIQ: customerID,
            UAGT: request.httpHeaders || null,
            UDF: kount.getUDFFields(order),
            EPOC: customerCreateDate
        };
        if (!empty(paymentToken) || payMethod == 'CREDIT_CARD') { //eslint-disable-line
            RequiredInquiryKeysVal.PENC = 'KHASH';
        }
        if (payMethod == 'CREDIT_CARD') { //eslint-disable-line
            RequiredInquiryKeysVal.LAST4 = creditCard.Last4 || null;
        }
    }

    try {
        var response = kount.postRISRequest(RequiredInquiryKeysVal);
        if (!empty(response)) {
            if (constants.RISK_WORKFLOW_TYPE === constants.RISK_WORKFLOW_TYPE_PRE && !preRiskCall && orderID && args.Order.custom.kount_Status.value !== 'RETRY') {
                responseArgs.KountOrderStatus = args.Order.custom.kount_Status.value;
            } else {
                responseArgs.KountOrderStatus = kount.evaluateRISResponse(response);
            }
            responseArgs.responseRIS = response;
        } else {
            responseArgs.KountOrderStatus = 'APPROVED';
            responseArgs.responseRIS = '';
        }
    } catch (err) {
        kount.writeExecutionError(err, 'PostRiskInqueryService.ds', 'error');
        responseArgs.KountOrderStatus = 'APPROVED';
        responseArgs.responseRIS = '';
    }
    return responseArgs;
}

exports.init = init;
