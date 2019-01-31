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
*   @input KountOrderStatus : String
*
*/

function execute(args) {
	if(!empty(args.KountOrderStatus) && args.KountOrderStatus == "DECLINED") {
		return PIPELET_ERROR;
	}

	return PIPELET_NEXT;
}
