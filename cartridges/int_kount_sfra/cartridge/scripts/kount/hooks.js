'use strict';

function isUsingSFRA() {
	session.custom.isSFRA = 'true';
}

exports.onSession = isUsingSFRA;