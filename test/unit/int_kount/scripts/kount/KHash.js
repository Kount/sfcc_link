'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var constantsMock = {
    HASHSALTKEY: 'testsalt',
    MERCHANTID: 'testmerchant'
};

var base85Mock = {
    decode: function () {
        return 'decoded';
    }
};

var sha1Mock = {
    encode: function () {
        return 'e9coded1e9coded2e9coded3e9coded4e9coded5';
    }
};

describe('KHash', function () {
    var KHash = null;

    beforeEach(function () {
        KHash = proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/kount/KHash', {
            './KountConstants': constantsMock,
            '*/cartridge/scripts/kount/Base85': base85Mock,
            '*/cartridge/scripts/kount/SHA1': sha1Mock
        });
    });

    it('should provide hash function', function () {
        assert.isFunction(KHash.hash);
    });

    it('should provide hashPaymentToken function', function () {
        assert.isFunction(KHash.hashPaymentToken);
    });

    it('should provide hashGiftCard function', function () {
        assert.isFunction(KHash.hashGiftCard);
    });

    describe('KHash hash function', function () {
        it('hash function should generate proper hash string with provided length', function () {
            var result = KHash.hash('token12345', 4);
            assert.equal(result.length, 4);
            assert.equal(result, 'WC4G');
        });

        it('hash function should generate max 17 lenght hash string', function () {
            var result = KHash.hash('token12345', 18);
            assert.equal(result.length, 17);
            assert.equal(result, 'WC4GWCW8WCO0WCGSW');
        });
    });

    describe('KHash hashPaymentToken function', function () {
        it('hashPaymentToken function should handle null case', function () {
            var result = KHash.hashPaymentToken(null);
            assert.equal(result, '');
        });

        it('hashPaymentToken function should generate proper hash for token', function () {
            var result = KHash.hashPaymentToken('token12345');
            assert.equal(result, 'token1WC4GWCW8WCO0WC');
        });
    });

    describe('KHash hashGiftCard function', function () {
        it('hashGiftCard function should generate proper hash for card number', function () {
            var result = KHash.hashGiftCard('4111111111111111');
            assert.equal(result, 'testmerchantWC4GWCW8WCO0WC');
        });
    });
});
