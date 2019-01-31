"use strict"

/**
 * @description Base85 module to the sdk used for encode/decode.
 */
var Base85 = {
    'decode': function(a) {
    	  var c, d, e, f, g, h = String, l = "length", w = 255, x = "charCodeAt", y = "slice", z = "replace";
    	  for ("<~" === a[y](0, 2) && "~>" === a[y](-2), a = a[y](2, -2)[z](/\s/g, "")[z]("z", "!!!!!"), 
    	  c = "uuuuu"[y](a[l] % 5 || 5), a += c, e = [], f = 0, g = a[l]; g > f; f += 5) d = 52200625 * (a[x](f) - 33) + 614125 * (a[x](f + 1) - 33) + 7225 * (a[x](f + 2) - 33) + 85 * (a[x](f + 3) - 33) + (a[x](f + 4) - 33), 
    	  e.push(w & d >> 24, w & d >> 16, w & d >> 8, w & d);
    	  return function(a, b) {
    	    for (var c = b; c > 0; c--) a.pop();
    	  }(e, c[l]), h.fromCharCode.apply(h, e);
    	}
};

module.exports = Base85;