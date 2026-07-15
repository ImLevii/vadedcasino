const express = require('express');
const router = express.Router();

const cryptoRoute = require('./crypto');
const skinDeckRoute = require('./skindeck');

const giftCardsRoute = require('./deposit/giftCards');
const creditCardsRoute = require('./deposit/creditCards');

router.use('/crypto', cryptoRoute);
router.use('/skindeck', skinDeckRoute);

router.use('/deposit/giftcards', giftCardsRoute);
router.use('/deposit/cc', creditCardsRoute);

module.exports = router;