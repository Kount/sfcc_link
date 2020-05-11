/* eslint-disable no-mixed-operators */

'use strict';

/**
 * @description Base85 module to the sdk used for encode/decode.
 */
var Base85 = {
    decode: function (a) {
        var c;
        var d;
        var e;
        var f;
        var g;
        var h = String;
        var l = 'length';
        var w = 255;
        var x = 'charCodeAt';
        var y = 'slice';
        var z = 'replace';
        // eslint-disable-next-line no-param-reassign
        for (a[y](0, 2) === '<~' && a[y](-2) === '~>', a = a[y](2, -2)[z](/\s/g, '')[z]('z', '!!!!!'),
        // eslint-disable-next-line no-param-reassign
        c = 'uuuuu'[y](a[l] % 5 || 5), a += c, e = [], f = 0, g = a[l]; g > f; f += 5) {
            // eslint-disable-next-line no-unused-expressions
            // eslint-disable-next-line no-sequences
            d = 52200625 * (a[x](f) - 33) + 614125 * (a[x](f + 1) - 33) + 7225 * (a[x](f + 2) - 33) + 85 * (a[x](f + 3) - 33) + (a[x](f + 4) - 33);
            e.push(w & d >> 24, w & d >> 16, w & d >> 8, w & d);
        }
        // eslint-disable-next-line no-shadow
        return (function (a, b) {
            // eslint-disable-next-line no-shadow
            for (var c = b; c > 0; c--) a.pop();
        // eslint-disable-next-line no-sequences
        }(e, c[l])), h.fromCharCode.apply(h, e);
    }
};

module.exports = Base85;
