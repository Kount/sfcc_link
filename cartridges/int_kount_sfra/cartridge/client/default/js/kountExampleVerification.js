/* global $ */

'use strict';

$(document).ready(function () {
    $('body').on('checkout:serializeBilling', function (e, data) {
        if (data.data.indexOf('csrf_token') !== -1) {
            var kountData = data.data + '&' + $('.kount-test-verification select').serialize();
            data.callback(kountData);
        }
    });
});
