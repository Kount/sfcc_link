/**
* Demandware Script File
* To define input and output parameters, create entries of the form:
*
* @<paramUsageType> <paramName> : <paramDataType> [<paramComment>]
*
* where
*   <paramUsageType> can be either 'input' or 'output'
*   <paramName> can be any valid parameter name
*   <paramDataType> identifies the type of the parameter
*   <paramComment> is an optional comment
*
*
*   @input Basket : Object
*/

// Kount
var Kount = require('int_kount/cartridge/scripts/kount/LibKount');

function execute(args) {
	var call = Kount.preRiskCall(args.Basket, function() {});

	if(call && call.KountOrderStatus == "DECLINED") {
		return PIPELET_ERROR;
	}

	return PIPELET_NEXT;
}
