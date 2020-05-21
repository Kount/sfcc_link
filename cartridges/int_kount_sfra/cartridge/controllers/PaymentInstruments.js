'use strict';

var server = require('server');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var page = module.superModule;
server.extend(page);

server.append('SavePayment', csrfProtection.validateAjaxRequest, function (req, res, next) {
    var KHash = require('*/cartridge/scripts/kount/kHash');
    this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Transaction = require('dw/system/Transaction');

        var formInfo = res.getViewData();
        var customer = CustomerMgr.getCustomerByCustomerNumber(
            req.currentCustomer.profile.customerNo
        );
        var wallet = customer.getProfile().getWallet();
        var paymentInstruments = wallet.getPaymentInstruments().iterator();
        var paymentInstrument;
        while (paymentInstruments.hasNext()) {
            var cur = paymentInstruments.next();
            if (!paymentInstrument || cur.creationDate > paymentInstrument.creationDate) {
                paymentInstrument = cur;
            }
        }

        if (paymentInstrument) {
            Transaction.wrap(function () {
                paymentInstrument.custom.kount_KHash = KHash.hashPaymentToken(formInfo.cardNumber);
            });
        }
    });
    return next();
});

module.exports = server.exports();
