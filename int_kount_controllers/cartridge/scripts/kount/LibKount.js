"use strict"

// API
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var logger = require('dw/system/Logger').getLogger('kount', '');
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

// scripts
var constants = require('./KountConstants');
var RiskService = require('~/cartridge/scripts/kount/PostRiskInqueryService');
var UpdateOrder = require('~/cartridge/scripts/kount/UpdateOrder');
var KountUtils = require('~/cartridge/scripts/kount/KountUtils');

// Constants
var authType = require('~/cartridge/scripts/kount/KountConstants').RISK_WORKFLOW_TYPE;

(function (){
	var kount = function() {
		var service = ServiceRegistry.get('kount'),
			notificationEmailList = Site.getCustomPreferenceValue("kount_NotificationEmail") || [],
			SiteName = Site.getName(),
			UDFFields = Site.getCurrent().getCustomPreferenceValue("kount_UDF") || [];
		
		return {
			
			_isKountEnabled: function(){
				return Site.getCustomPreferenceValue('kount_IsEnabled') ? true : false;
			},
			
			_getDCUrl: function(){
				return Site.getCustomPreferenceValue('kount_MODE').value == 'Test' ? constants.DC_TEST_URL : constants.DC_PRODUCTION_URL;
			},
			
			_getRISUrl: function(){
				return Site.getCustomPreferenceValue('kount_MODE').value == 'Test' ? constants.RIS_TEST_URL : constants.RIS_PRODUCTION_URL;
			},

			_getWorkflowType: function() {
				return Site.getCustomPreferenceValue('kount_AUTH_TYPE');
			},
			
			_getIPList: function(){
				return Site.getCustomPreferenceValue('kount_IPFilter') || "";
			},
			
			_getWebsiteID: function(){
				return Site.getCustomPreferenceValue('kount_WebsiteId') || "";
			},
			
			_getMercahntID: function(){
				return Site.getCustomPreferenceValue('kount_MerchantID') || "";
			},
			
			_clearSession: function() {
				session.custom['kount_TRAN'] = null;
			},
			
			_isENSEnabled: function(){
				return Site.getCustomPreferenceValue('kount_ENS') ? true : false;
			},
			
			_getEmailList: function(){
				return Site.getCustomPreferenceValue('kount_EmailList') || "";
			},
			
			_getNotificationEmailList: function(){
				return notificationEmailList;
			},
			
			_getCoreScript: function (scriptName) {
				return constants.CORE_SCRIPTS_PATH ? require(constants.CORE_SCRIPTS_PATH + '/cartridge/scripts/' + scriptName) : false;
			},

			_getNotificationEmail: function () {
				return Resource.msg('kount.noemail','kount',null);
			},
			
			_getAPIKey: function(){
				var kount_APIKey = Site.getCustomPreferenceValue('kount_APIKey');
				return Site.getCustomPreferenceValue('kount_APIKey');
			},
			
			// KHASH algorithm
			khash: function(bin, length) {
				var text = "";
			    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

			    for( var i=0; i < length; i++ )
			        text += possible.charAt(Math.floor(Math.random() * possible.length));

			    return bin+text;
			},
			
			filterIP: function(IP){
			   var listIP = this._getIPList(),
			   	   status = false;
	    	  
	    	   if(listIP.indexOf(IP) != -1 ){
	    	   	   status = true;
	    	   }
			   return status;
			},
			
			/**
			 * @description Makes POST request. Sends orders details for evaluating
			 * @param RequiredInquiryKeysVal : Object
			 * @return Object parsed response or empty object (if an error occurred)
			 */
			PostRISRequest: function(RequiredInquiryKeysVal){
				var	body = {},
					status = {},
					httpResult;
					
				service.setURL(this._getRISUrl());
	 		    service.addHeader("X-Kount-Api-Key", this._getAPIKey());
				
				for (var key in RequiredInquiryKeysVal){
					try {
						var param = !empty(RequiredInquiryKeysVal[key]) ? RequiredInquiryKeysVal[key] : '';
						if(typeof param === 'object' && !empty(param)){
							if(key === 'UDF'){
								for(var i=0; i<param.length; i++){
									body[key+"["+param[i].label+"]" ] = param[i].value;	
								}	
							} else {
								for(var i=0; i<param.length; i++){
									body[key+"["+i+"]"] = param[i];	
								}	
							}
						} else if (!empty(param)){
							body[key] = param;
						}
					} catch (err){
						this.writeExecutionError(err, "PostRISRequest", "error");
	 		    		throw err;
	 		    	}
				}
				
		    	httpResult = service.call(body);
				if (httpResult.ok){
					status = httpResult.object;
					return status;
				} else {
					this.writeExecutionError(httpResult.errorMessage, "PostRISRequest", "error");
					return status;
				}
			},    
			
			/**
			 * @description Add warning and error messages to log and returns Kount order status
			 * Status APPROVED sents by-default if Kount response contains error messages
			 * 
			 * @param params : Object response from Kount
			 * @return String Kount status
			 */
			evaluateRISResponse: function(params){
				var status = "APPROVED",
					responseCode = params['AUTO'],
					statusMap = { A : 'APPROVED', D : 'DECLINED', R : 'HOLD', E : 'HOLD' };
	
				if('ERRO' in params){
					this.writeServiceError(params, "evaluateRISResponse", "ERROR_");
					return status;
				} else {
					if("WARNING_0" in params) {
						this.writeServiceError(params, "evaluateRISResponse", "WARNING_");
					}	
					return statusMap[responseCode];
				}
			}, 
			
			/**
			*	@description Method that write ERRORs in execution
			*	@param {Error} Error object
			*	@param {String} Name of method
			*	@param {String} type of error
			*/
	   		writeExecutionError : function (error, actionName, type) {
	   			var message = typeof error == "object" ? error.message : error,
					time = new Date().toISOString(),
					actionName = actionName || 'Exception';
				
				switch(type){
					case "error":
						var errorString = Resource.msgf("error.exeption", "error", null, actionName, message).replace(new RegExp(/(?!<\")\/[^]+\/(?!\")/g), "");
						logger.error(errorString, "");
						if (!empty(notificationEmailList)) {
							this.sendEmailNotification(errorString);
						} else {
							this.writeExecutionError(new Error("Email List is empty"), "writeExecutionError", "warn");
						}
						break;
					case "warn":
						var errorString = Resource.msgf("error.exeption", "error", null, actionName, message);
							logger.warn(errorString, "");
						break;
				}	
				
			}, 
			
			/**
			*	@description Method that write response ERRORs
			*	@param {Object} Response from request 
			*	@param {String} Name of method
			*	@param {String} Type of error 
			*/
	   		writeServiceError: function(response, method, type){
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
							this.writeExecutionError(new Error(errorArray.join(";")), method, "error");
							break;
						case "WARNING_":
							this.writeExecutionError(new Error(errorArray.join(";")), method, "warn");
							break;
					}	
	   			}   			
	   		}, 
	   		/**
			*	@description Method that write responses ERRORs
			*	@param {Stirng} Response from request 
			*	@return {Boolean} Show status if it is a plain text response
			*/
	   		plainTextHandler: function (response){
				var status = true;
	   			if (response.indexOf("\n") != -1){
	   				var responseArray = response.split("\n"),
	   					errorArray = [];
	   				for (var i = 0; i < responseArray.length-1; i++){
	   					if(responseArray[i].indexOf("ERROR_") != -1 && responseArray[i].indexOf("ERROR_COUNT") == -1){
	   						errorArray.push(responseArray[i]);
	   					}
	   				}
	   				this.writeExecutionError(new Error(errorArray.join(";")), "plainTextHandler", "error");
	   			} else {
	   				status = false;
	   			}
	   			
	   			return status;
	   		}, 
	   		
	   		/**
			*	@description Method that send email notification about errors
			*	@param {String} Error message
			*/
			sendEmailNotification: function(msg){
				var template = new Template("mail/errornotification"),
					templateMap = new HashMap(),
					mailMsg = new Mail();
					
				templateMap.put("ErrorName", "Error during execution");
				templateMap.put("SiteName", SiteName);
				templateMap.put("ErrorDescription", msg);
				
				mailMsg.addTo(notificationEmailList.join(","));
				mailMsg.setFrom("noreply@kount.net");
	  			mailMsg.setSubject("Error during execution");
	  			mailMsg.setContent(template.render(templateMap));
	
	  			mailMsg.send();
			}, 
			
			/**
			*	@description Method creates UDF fields for request
			*	@param {Order} Order
			*	@return {Array} return UDF array with structure lable : value
			*/
			getUDFFields: function (order){
				var fields = UDFFields,
					UDF = [],
					UDFMap = this.getUDFObjectMap(order);
					
				try {
					if (!empty(fields)){
						for(let i = 0;i < fields.length;i++){
							var field = fields[i].split("|");
							
							field[0] = StringUtils.trim(field[0]);	
							field[1] = StringUtils.trim(field[1]).split(".");
							if(!empty(field[1][1])){
								var mapObject = UDFMap.get(field[1][0].toLowerCase()),
									value = !empty(mapObject) ? this.getUDFFieldValue(mapObject.meta, mapObject.object, field[1][1]) : "";
								if(!empty(value)){
									UDF.push({
										"label" : field[0],
										"value" : value
									});
								}
							} else {
								this.writeExecutionError(new Error("UDF field doesn't setup correctly: " +  fields[i]),"getUDFFields", "error");
							}	
						}
					}
				} catch(e){
					this.writeExecutionError(e,"getUDFFields", "error");
				}
				return UDF;
			},
			preRiskCall: function(basket, callback) {
				if(this._isKountEnabled() && authType == constants.RISK_WORKFLOW_TYPE_PRE) {
					try {
						var data = basket.constructor == Basket ? basket : basket.object;
	 					var result = this.PostRIS(data);
						if(!empty(result.KountOrderStatus) && result.KountOrderStatus == "DECLINED") {
							 callback({
							 	KountOrderStatus: result.KountOrderStatus,
							 	order_created: false
							 });
							return result;
						} else {
							session.custom['kount_TRAN'] = result.responseRIS.TRAN;
							return result;
						}
					} catch (e) {
						this.writeExecutionError(new Error("KOUNT: libKount.js: Problem with pre auth risk"), "preRiskCall", "error");
					}
				}
			},
			/**
			 * @description Run RISK workflow. Triggered by COBilling controller
			 * @param paymentCallback
			 * @param order
			 * @param COBillingController
             * @returns {object}
             */
			postRiskCall: function(paymentCallback, order) {
				if(this._isKountEnabled()) {
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
					var result = handleCallResult(KountUtils.extend(this.PostRIS(order), paymentCallback(order)));
					// clear session variable "TRAN" for "PRE" auth.
					this._clearSession();
					return result;
				} else {
					this.writeExecutionError(new Error("KOUNT: K.js: Kount is not enabled"), "PostRIS", "error");
					this._clearSession();
					return paymentCallback(order);
				}
			},
			/**
			 * @description Call Kount with data from DataCollector and custom order data
			 * @param Order
             * @returns {*}
             * @constructor
             */
			PostRIS: function(Order) {
				var riskResult = RiskService.init({
					'SessionID': session.custom.sessId,
					'Email': session.forms.billing.billingAddress.email.emailAddress.htmlValue,
					'PaymentType': session.forms.billing.paymentMethods.selectedPaymentMethodID.htmlValue,
					'CardNumber': session.forms.billing.paymentMethods.creditCard.number.value,
					'CurrentRequest': request,
					'Order': Order,
					'OrderID': Order.constructor != Basket ? Order.orderNo : null 
				});

				UpdateOrder.init(Order, riskResult);
				
			return riskResult;
		},
		/**
			*	@description Method creates UDF fields for request
			*	@param {Object} Described object
			*	@param {String} Attributes name 
			* 	@return {Object}
			*/
			getUDFFieldValue : function (meta, object, propertyName){
				var attribute = meta.getSystemAttributeDefinition(propertyName) || meta.getCustomAttributeDefinition(propertyName),
					value = "";
					
				if (!empty(attribute)){
					switch (attribute.valueTypeCode) {
					case ObjectAttributeDefinition.VALUE_TYPE_DATE:
						value = this.getUDFValue(attribute, object, propertyName);
						if(!empty(value)){
							value = StringUtils.formatCalendar(new Calendar(value), "yyyy-MM-dd");
						} else {
							value = "";
						}
						
						break;
					case ObjectAttributeDefinition.VALUE_TYPE_DATETIME:
						value = this.getUDFValue(attribute, object, propertyName);
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
						value = this.getUDFValue(attribute, object, propertyName);
						if(empty(value)){ 
							value = "";
						}
					}
				}
				return value;
			},
			/**
			*	@description Method creates UDF fields for request
			*	@param {Object} Order
			*	@return {String} value of attribute
			*/
			getUDFValue: function (attribute, object, propertyName){
				if (!attribute.multiValueType && attribute.system) {
					return object[propertyName];
				} else if (!attribute.multiValueType && !attribute.system) {
					return object.custom[propertyName];
				} else {
					return null
				}
			},
			/**
			*	@description Method creates UDF fields for request
			*	@param {Order} Order
			*	@return {HashMap} mapped object for UDF
			*/
			getUDFObjectMap: function (order : Order){
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
			}, 
			/**
			*	@description Method creates UDF fields for request
			*	@param {Collection} Order
			*	@return {Payment} First Payment method
			*/
			getPayment: function (payments) {
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
			},
			
			getSessionIframe: function (sessionIframe, basketUUID) {
				  var sessionId = sessionIframe.substr(0,24).replace('-','_','g') + basketUUID.substr(0,8).replace('-','_','g');
				  session.custom['sessId'] = sessionId;
				  return sessionId;
			  }
			
		}
	}
	module.exports = new kount();
}());