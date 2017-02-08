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
*   @input Order : Object
*   @output KountOrderStatus : String
*
*/

// Kount
var Kount = require('int_kount_pipelines/cartridge/scripts/kount/LibKount');

function execute(args)  {
		
	var call = Kount.postRiskCall(function() {}, args.Order);
	
	if(empty(call)) {
    	return PIPELET_ERROR;
    }
	
    args.KountOrderStatus = call.KountOrderStatus;
    return PIPELET_NEXT;
}
