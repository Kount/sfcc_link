'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('Base85', function () {
    var Base85 = null;

    beforeEach(function () {
        Base85 = proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/kount/base85', {});
    });

    it('should provide a decode function', function () {
        assert.isFunction(Base85.decode);
    });

    it('should decode Base85 encoded text', function () {
        assert.equal(Base85.decode("<~9Q+r_D'3P3F*2=BA8c:&EZfF;F<G\"/ATR~>"), 'Lorem ipsum dolor sit amet');
    });
});
