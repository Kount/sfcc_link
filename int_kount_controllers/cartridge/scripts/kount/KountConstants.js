var Site = require('dw/system/Site').current;

exports.DC_PRODUCTION_URL = 'https://kaptcha.com';
exports.DC_TEST_URL = 'https://tst.kaptcha.com';
exports.RIS_TEST_URL = 'https://risk.test.kount.net';
exports.RIS_PRODUCTION_URL = 'https://risk.kount.net';
exports.ALLOWED_RISK_PARAMS = ['SCOR', 'REPLY', 'VELO', 'VMAX', 'GEOX', 'NETW', 'REAS'];
exports.RISK_WORKFLOW_TYPE = Site.getCustomPreferenceValue('kount_AUTH_TYPE').value;
exports.RISK_WORKFLOW_TYPE_POST = "post";
exports.RISK_WORKFLOW_TYPE_PRE = 'pre';
exports.CORE_SCRIPTS_PATH = Site.getCustomPreferenceValue("kount_CORE");

// Mistakes in the Kount documentation (Mode=U article)
exports.ALLOWED_PAYMENT_METHODS = ['PYPL','BLML','GDMP','GOOG'];