const express = require('express');
const router = express.Router();

const { sql } = require('../../database');
const speakeasy = require('speakeasy');

const { isAuthed, apiLimiter, expiresIn, getReqToken } = require('../auth/functions');
const { sendLog } = require('../../utils');

router.use(isAuthed);

const adminRoles = ['ADMIN', 'OWNER', 'DEV'];
const authorizedAdmins = {};

router.post('/2fa', apiLimiter, async (req, res) => {

    const jwt = getReqToken(req);
    if (authorizedAdmins[jwt]) return res.json({ error: 'ALREADY_AUTHORIZED' });

    const [[user]] = await sql.query('SELECT id, username, 2fa, role FROM users WHERE id = ?', [req.userId]);
    if (!user || !adminRoles.includes(user.role)) return res.json({ error: 'UNAUTHORIZED' });

    // 2FA disabled - authorize admins directly without requiring a token
    authorizedAdmins[jwt] = true;

    setTimeout(() => {
        delete authorizedAdmins[jwt];
    }, 1000 * 60 * 30);

    sendLog('admin', `[\`${req.userId}\`] *${user.username}* logged into admin panel.`);
    return res.json({ success: true });

});

router.get('/unpossess', async (req, res) => {

    if (!req.cookies['admjwt']) return res.redirect('/');
    res.cookie('jwt', req.cookies['admjwt'], { maxAge: expiresIn * 1000 });
    res.clearCookie('admjwt');

    res.redirect('/');

});

router.use(async (req, res, next) => {

    const [[user]] = await sql.query('SELECT id, role, username, perms FROM users WHERE id = ?', [req.userId]);
    if (!user || !adminRoles.includes(user.role)) return res.json({ error: 'UNAUTHORIZED' });

    if (!authorizedAdmins[getReqToken(req)]) {
        return res.json({ error: '2FA_REQUIRED' });
    }

    req.user = user;
    next();

});

const usersRoute = require('./users');
const phrasesRoute = require('./phrases');
const rainRoute = require('./rain');
const featuresRoute = require('./features');
const cashierRoute = require('./cashier');
const statsbookRoute = require('./statsbook');
const dashboardRoute = require('./dashboard');
const announcementsRoute = require('./announcements');
const casesRoute = require('./cases');
const slidesRoute = require('./slides');
const rewardsRoute = require('./rewards');

router.use('/users', usersRoute);
router.use('/phrases', phrasesRoute);
router.use('/rain', rainRoute);
router.use('/features', featuresRoute);
router.use('/cashier', cashierRoute);
router.use('/statsbook', statsbookRoute);
router.use('/dashboard', dashboardRoute);
router.use('/announcements', announcementsRoute);
router.use('/cases', casesRoute);
router.use('/slides', slidesRoute);
router.use('/rewards', rewardsRoute);

module.exports = router;