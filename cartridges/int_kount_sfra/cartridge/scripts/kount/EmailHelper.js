'use strict';

var Mail = require('dw/net/Mail');
var HashMap = require('dw/util/HashMap');
var Template = require('dw/util/Template');

/**
 * @param {Object} args - pdict of the execution
 */
function sendEmail(args) {
    var mail = new Mail();
    var context = new HashMap();
    var template;
    var content;

    mail.addTo(args.to);
    mail.setSubject(args.subject);
    mail.setFrom(args.from);

    var templateData = args.data;

    Object.keys(templateData).forEach(function (key) {
        context.put(key, templateData[key]);
    });

    template = new Template(args.template);
    content = template.render(context).text;
    mail.setContent(content, 'text/html', 'UTF-8');
    mail.send();
}

exports.sendEmail = sendEmail;
