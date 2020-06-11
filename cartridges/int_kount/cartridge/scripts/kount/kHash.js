'use strict';

var Base85 = require('*/cartridge/scripts/kount/base85');
var SHA1 = require('*/cartridge/scripts/kount/sha1');
var constants = require('*/cartridge/scripts/kount/kountConstants');

/**
 * @description Base85 module to the sdk used for encode/decode.
 */
var KHash = {
    hash: function (data, len) {
        var configKey = constants.HASHSALTKEY;
		// check prefix and suffix
        if (!(/^(<~)+.+(~>)$/.test(configKey))) {
            configKey = '<~' + configKey + '~>';
        }

        var decodedConfigKey = Base85.decode(configKey);
        var a = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var r = SHA1.encode(data + '.' + decodedConfigKey);
        var c = '';
        if (len > 17) {
            // eslint-disable-next-line no-param-reassign
            len = 17;
        }
        var limit = 2 * len;
        for (var i = 0; i < limit; i += 2) {
            c += a[parseInt(r.substr(i, 7), 16) % 36];
        }
        return c;
    },
    hashPaymentToken: function (token) {
        var hashedPaymentToken = '';
        if (!(token == null)) {
            var firstSix = token.substr(0, 6);
            var hash = this.hash(token, 14);
            hashedPaymentToken = firstSix + hash;
        }
        return hashedPaymentToken;
    },
    hashGiftCard: function (cardNumber) {
        var merchantId = constants.MERCHANTID;
        var hash = this.hash(cardNumber, 14);
        return merchantId + hash;
    }
};

module.exports = KHash;
