const { assertProviderContract } = require('./contract');
const { validateSkinDeckConfig } = require('./config');

function createSkinDeckClient() {
    validateSkinDeckConfig({ api: true });
    assertProviderContract();
}

module.exports = {
    createSkinDeckClient
};