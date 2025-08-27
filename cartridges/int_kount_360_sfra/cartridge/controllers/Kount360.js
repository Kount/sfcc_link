'use strict';

var server = require('server');
var Logger = require('dw/system/Logger').getLogger('kount-360', 'webhooks');
var kountWebhookValidator = require('*/cartridge/scripts/helpers/kountWebhookValidator');

server.post('Webhook', function (req, res, next) {
    var Site = require('dw/system/Site');

    if (!Site.getCurrent().getCustomPreferenceValue('kount360WebhooksEnabled')) {
        res.json({ success: true });
        return next();
    }

    var validationResult = kountWebhookValidator.validate(req);

    if (!validationResult.valid) {
        Logger.error('Kount webhook validation failed: {0}', validationResult.error);
        res.setStatusCode(403);
        res.json({ error: true, message: 'Webhook validation failed: ' + validationResult.error });
        return next();
    }

    require('*/cartridge/scripts/helpers/kount360Helpers').storeWebhookEvent(req.body);

    res.json({ success: true });

    return next();
});

module.exports = server.exports();
