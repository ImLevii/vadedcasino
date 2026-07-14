const express = require('express');
const router = express.Router();

// const robuxRoute = require('./robux');  // Removed: Roblox-specific
// const limitedsRoute = require('./limiteds');  // Removed: Roblox-specific
const cryptoRoute = require('./crypto');
const skinDeckRoute = require('./skindeck');

const giftCardsRoute = require('./deposit/giftCards');
const creditCardsRoute = require('./deposit/creditCards');

// router.use('/robux', robuxRoute);  // Removed: Roblox-specific
// router.use('/limiteds', limitedsRoute);  // Removed: Roblox-specific
router.use('/crypto', cryptoRoute);
router.use('/skindeck', skinDeckRoute);

router.use('/deposit/giftcards', giftCardsRoute);
router.use('/deposit/cc', creditCardsRoute);

module.exports = router;