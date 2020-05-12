'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('SHA1', function () {
    var SHA1 = null;

    beforeEach(function () {
        SHA1 = proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/kount/SHA1', {});
    });

    it('should export an encode function', function () {
        assert.isFunction(SHA1.encode);
    });

    it('should encode string using SHA1 algorithm', function () {
        assert.equal(SHA1.encode('Lorem ipsum dolor sit amet'), '38f00f8738e241daea6f37f6f55ae8414d7b0219');
    });
});
