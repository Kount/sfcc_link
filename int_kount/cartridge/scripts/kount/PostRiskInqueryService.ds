"use strict"

// API
var Site = require('dw/system/Site');
var System = require('dw/system/System');
var Order = require('dw/order/Order');
var Customer = require('dw/customer/Customer');
var LineItem = require('dw/order/LineItem');
var Resource = require('dw/web/Resource');

// scripts
var constants = require('./KountConstants');

var responseArgs = {
	KountOrderStatus: '',
	responseRIS: ''
};

/**
 *
 * @param args Object {{
	'SessionID': String,
	'Email': String,
	'CardNumber': Number,
	'CurrentRequest': Object,
	'Order': Object,
	'OrderID': String
  }}
 * @returns Object {{KountOrderStatus: string, responseRIS: string}}
 */
function init(args) {
	var kount = require('~/cartridge/scripts/kount/LibKount');
	var	request = args.CurrentRequest;
	var	email = args.Email || Resource.msg('kount.noemail','kount',null);
	var	IP = request.httpRemoteAddress;
	var	sessID = args.SessionID;
	var	orderID = args.OrderID;
	var	order = args.Order;
	var	totalPrice = (order.getTotalGrossPrice().getValue()*100).toFixed();
	var	customer = order.getCustomer();
	var	profile = customer.getProfile();
	var	billingAddr = order.getBillingAddress();
	var	customerID = !empty(profile) ? profile.getCustomerNo() : '';
	var	customerName = !empty(profile) ? profile.getFirstName()+' '+profile.getSecondName()+' '+profile.getLastName() : billingAddr.getFullName();
	var	customerEmail= !empty(profile) ? profile.getEmail() : email;
	var	shippingTypeMap = { Foreign : 'SD', Overnight : 'ND', '2-Day Express' : '2D', Ground  : 'ST', Express : '2D', USPS : 'ST', 'Super Saver' : 'ST' };
	var	payInstrColl = order.getPaymentInstruments();
	var	payInstr = kount.getPayment(payInstrColl);
	var	creditCard = args.CardNumber;
	var	paymentTypeMap = { BML: 'BLML', CREDIT_CARD: 'CARD', GIFT_CERTIFICATE: 'GIFT', PayPal: 'PYPL' };
	var	paymentTokenMap = { BML: '', CREDIT_CARD: creditCard, GIFT_CERTIFICATE: payInstr ? payInstr.getGiftCertificateCode() : '', PayPal: payInstr ? "paypalPayerID" in payInstr.custom && !empty(payInstr.custom.paypalPayerID) ? payInstr.custom.paypalPayerID : "" : ""};
	var	paymentType = 'NONE';
	var	paymentToken = null;
	var	allProducts = order.allProductLineItems.iterator();
	var	getGiftCertificateLineItems = order.getGiftCertificateLineItems().iterator();
	var	ProdDescVals = [];
	var	ProdItemVals = [];
	var	ProdPriceVals = [];
	var	ProdQuantVals = [];
	var	ProdTypeVals = [];
	var	shippStreet1 = '';
	var	shippStreet2 = '';
	var	shippCountry = '';
	var	shippCity = '';
	var	shippName = '';
	var	shippPostalCode = '';
	var	shippPhoneNumber = '';
	var	shippState = '';
	var	shippType ='';

	// GiftCert
	while (getGiftCertificateLineItems.hasNext()){
		    var li = getGiftCertificateLineItems.next();
			if(li.getPriceValue() != 0){
				var prodType =  li.getLineItemText();
				var	price = (li.getBasePrice().getValue()*100).toFixed();
				ProdDescVals.push(li.getLineItemText());
				ProdItemVals.push(li.getUUID());  // use UUID
				ProdPriceVals.push(price);
				ProdQuantVals.push(1);
				ProdTypeVals.push(prodType);
		}
	}	
	
	while (allProducts.hasNext()){
		var pli = allProducts.next();
		if(pli.getPriceValue() != 0){
			var prodType =  !empty(pli.getCategory()) ? pli.getCategory().getDisplayName() : pli.getProductName(),
				price = (pli.getBasePrice().getValue()*100).toFixed();
			ProdDescVals.push(pli.getLineItemText());
			ProdItemVals.push(pli.getProductID());
			ProdPriceVals.push(price);
			ProdQuantVals.push(pli.getQuantityValue());
			ProdTypeVals.push(prodType);		
		}
	}

	var payMethod = payInstr ? payInstr.getPaymentMethod() : args.PaymentType;
		
	// When gift certificate apply to order - payment method becomes GIFT and real payment info goes missing.
	// Need to send real billing info instead
	// args.PaymentType comes from session (checkbox of the one of the billing forms)
	if(payMethod == 'GIFT_CERTIFICATE' && args.PaymentType != 'GIFT_CERTIFICATE') {
		payMethod = args.PaymentType;
	}
	
	if(payMethod in paymentTypeMap){
		// paymentProcessor can be null in "PRE" auth workflow
		var paymentTransactionID = payInstr ? payInstr.paymentTransaction.paymentProcessor && payInstr.paymentTransaction.paymentProcessor.ID : '';
		//integration of PayPal Direct Payment
		if (payMethod == "CREDIT_CARD" && paymentTransactionID == "PAYPAL_PAYMENTSPRO" ){
			paymentType = paymentTypeMap["CREDIT_CARD"] || paymentTypeMap["PayPal"] ;
			paymentToken = paymentTokenMap["CREDIT_CARD"] ||  paymentTokenMap["PayPal"];
		} else {
			paymentType = paymentTypeMap[payMethod];
			paymentToken = paymentTokenMap[payMethod];
		};
	}
		
	var shipments = order.getShipments(),
		iter = shipments.iterator();
	while(iter != null && iter.hasNext()){
		var shipment = iter.next(),
			shippAddr = shipment.getShippingAddress();
		
		// In case of purchasing gift card with other products (giftCard always last in collection)
		// need to stop overwriting of real address
		if((shippStreet1 && shippName && shippPostalCode && shippMethod) && !shippAddr) {
			break;
		}
		
		// needed for GC purchase, because GC checkout doesn't have ShippingAddress Object
		shippStreet1 = shippAddr ? shippAddr.getAddress1() : '';
		shippStreet2 = shippAddr ? shippAddr.getAddress2() : '';
		shippCountry = shippAddr ? shippAddr.getCountryCode().getValue() : '';
		shippCity = shippAddr ? shippAddr.getCity() : '';
		shippName = shippAddr ? shippAddr.getFullName() : '';
		shippPostalCode = shippAddr ? shippAddr.getPostalCode() : '';
		shippPhoneNumber = shippAddr ? shippAddr.getPhone() : '';
		shippState = shippAddr ? shippAddr.getStateCode() : '';
		
		try {
			var shippMethod = shipment.getShippingMethod() ? shipment.getShippingMethod().getDisplayName() : "";
		} catch (err){
			kount.writeExecutionError(err, "PostRiskInqueryService.ds", "error");
 		}
		
		
		if(shippMethod in shippingTypeMap){
			shippType = shippingTypeMap[shippMethod];
		}
	}	
	var RequiredInquiryKeysVal;
	if (constants.RISK_WORKFLOW_TYPE == constants.RISK_WORKFLOW_TYPE_PRE && orderID) {
		RequiredInquiryKeysVal = {
			AUTH : Resource.msg('kount.AUTH','kount',null),
			AVST : 'X',
			AVSZ : 'X',
			CVVR : 'X',
			FRMT : Resource.msg('kount.FRMT','kount',null),
			MACK : Resource.msg('kount.MACK','kount',null),
			MERC : kount._getMercahntID(),
			MODE : Resource.msg('kount.MODE_UPDATE','kount',null),
			PTOK : kount.khash(paymentToken.substring(0,6), 14),
			SESS : sessID,
			ORDR : orderID,
			TRAN : session.custom.kount_TRAN,
			VERS : Resource.msg('kount.VERS','kount',null),
			PENC : 'KHASH'
		}
		/**
		 * @FIXME Kount documentation (v.6.4.5: "Method U" article) mistake. If payment method in initial request == Paypal,
		 * key PTYP in final request comes to required
		 */
		if(constants.ALLOWED_PAYMENT_METHODS.indexOf(paymentType) != -1) {
			RequiredInquiryKeysVal.PTYP = paymentType;
		}
	} else {
		RequiredInquiryKeysVal = {
			AUTH : Resource.msg('kount.AUTH','kount',null), // For it need imported certificate to Bussiness Manager
			CURR : Site.getCurrent().getDefaultCurrency(),
			EMAL : customerEmail,
			IPAD : IP,
			MACK : Resource.msg('kount.MACK','kount',null),
			MERC : kount._getMercahntID(),
			MODE : Resource.msg('kount.MODE_INITIAL','kount',null),
			PROD_DESC : ProdDescVals,
			PROD_ITEM : ProdItemVals,
			PROD_PRICE : ProdPriceVals,
			PROD_QUANT : ProdQuantVals,
			PROD_TYPE : ProdTypeVals,
			PTOK : paymentToken ? kount.khash(paymentToken.substring(0,6), 14) : '',
			PTYP : paymentType,
			SESS : sessID,
			SITE : kount._getWebsiteID(),
			TOTL : totalPrice,
			VERS : Resource.msg('kount.VERS','kount',null),// Provided by Kount
			// Optional keys
			AVST : 'X',
			AVSZ : 'X',
			B2A1 : billingAddr.getAddress1(),
			B2A2 : billingAddr.getAddress2(),
			B2CC : billingAddr.getCountryCode().getValue(),
			B2CI : billingAddr.getCity(),
			B2PC : billingAddr.getPostalCode(),
			B2PN : billingAddr.getPhone(),
			B2ST : billingAddr.getStateCode(),
			CASH : totalPrice,
			CVVR : 'X',
			NAME : customerName,
			FRMT : Resource.msg('kount.FRMT','kount',null),
			ORDR : orderID,
			S2A1 : shippStreet1,
			S2A2 : shippStreet2,
			S2CC : shippCountry,
			S2CI : shippCity,
			S2EM : email,
			S2NM : shippName,
			S2PC : shippPostalCode,
			S2PN : shippPhoneNumber,
			S2ST : shippState,
			SHTP : shippType,
			UNIQ : customerID,
			UAGT : request.httpHeaders,
			UDF  : kount.getUDFFields(order)
		};
		if(!empty(paymentToken)) {
			RequiredInquiryKeysVal.PENC = 'KHASH';
		}
	}
	
	try {
		var response = kount.PostRISRequest(RequiredInquiryKeysVal);
		if(!empty(response)){
			if(constants.RISK_WORKFLOW_TYPE == constants.RISK_WORKFLOW_TYPE_PRE && orderID) {
				responseArgs.KountOrderStatus = args.Order.custom.kount_Status.value;
			} else {
				responseArgs.KountOrderStatus = kount.evaluateRISResponse(response);
			}
			responseArgs.responseRIS = response;
		} else {
			responseArgs.KountOrderStatus = "APPROVED";
			responseArgs.responseRIS = '';
		}
	} catch (err){
		kount.writeExecutionError(err, "PostRiskInqueryService.ds", "error");
		responseArgs.KountOrderStatus = "APPROVED";
		responseArgs.responseRIS = '';
 	}
    return responseArgs;
}

exports.init = init;
