const express = require('express');
const router = express.Router();

const { sql } = require('../../database');
const speakeasy = require('speakeasy');

const { isAuthed, apiLimiter, expiresIn, getReqToken } = require('../auth/functions');
const { sendLog } = require('../../utils');

router.use(isAuthed);

const access = require('./access');
const adminRoles = access.roles;

router.post('/2fa', apiLimiter, async (req, res) => {

    const jwt = getReqToken(req);
    const alreadyAuthorized = await access.session(jwt);
    if (alreadyAuthorized) return res.json({ error: 'ALREADY_AUTHORIZED' });

    const [[user]] = await sql.query('SELECT id, username, 2fa, role FROM users WHERE id = ?', [req.userId]);
    if (!user || !adminRoles.includes(user.role)) return res.json({ error: 'UNAUTHORIZED' });

    if(user['2fa'] && !speakeasy.totp.verify({secret:user['2fa'],encoding:'base32',token:String(req.body?.token || ''),window:1})) {
        return res.status(403).json({error:'INVALID_2FA'});
    }
    await access.grant(jwt);

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

    const authorized = await access.session(getReqToken(req));
    if (!authorized) {
        return res.json({ error: '2FA_REQUIRED' });
    }

    req.user = user;
    req.permissions = access.permissions[user.role] || [];
    if (user.role === 'DEV' && !['/session','/operations','/games'].some(path => req.path === path || req.path.startsWith(path+'/'))) return res.status(403).json({error:'FORBIDDEN'});
    if (user.role === 'DEV' && req.method !== 'GET' && !req.path.startsWith('/operations/')) return res.status(403).json({error:'FORBIDDEN'});
    next();

});

const usersRoute = require('./users');
const phrasesRoute = require('./phrases');
const rainRoute = require('./rain');
const featuresRoute = require('./features');
const cashierRoute = require('./cashier/core');
const statsbookRoute = require('./statsbook');
const dashboardRoute = require('./dashboard');
const announcementsRoute = require('./announcements');
const casesRoute = require('./cases');
const slidesRoute = require('./slides');
const rewardsRoute = require('./rewards');
const gamesRoute = require('./games');

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
router.use('/games', gamesRoute);
router.use('/operations', require('./operations'));

router.get('/session', (req,res)=>res.json({success:true,user:{id:req.user.id,username:req.user.username,role:req.user.role},permissions:req.permissions}));

module.exports = router;
