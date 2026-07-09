const express = require('express');
const router = express.Router();
const { sql } = require('../../database');
const { sendLog } = require('../../utils');
const io = require('../../socketio/server');
const isSqlite = (process.env.SQL_DIALECT || '').toLowerCase() === 'sqlite';

// Ensure table exists at startup
if (isSqlite) {
    sql.query(`
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            link TEXT DEFAULT NULL,
            linkText TEXT DEFAULT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            dismissible INTEGER NOT NULL DEFAULT 0,
            priority INTEGER NOT NULL DEFAULT 0,
            startsAt TEXT DEFAULT NULL,
            expiresAt TEXT DEFAULT NULL,
            createdBy INTEGER DEFAULT NULL,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `).catch(() => {});
} else {
    sql.query(`
        CREATE TABLE IF NOT EXISTS announcements (
            id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
            message     VARCHAR(500)     NOT NULL,
            type        ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
            link        VARCHAR(500)     DEFAULT NULL,
            linkText    VARCHAR(100)     DEFAULT NULL,
            active      TINYINT(1)       NOT NULL DEFAULT 1,
            dismissible TINYINT(1)       NOT NULL DEFAULT 0,
            priority    TINYINT UNSIGNED NOT NULL DEFAULT 0,
            startsAt    DATETIME         DEFAULT NULL,
            expiresAt   DATETIME         DEFAULT NULL,
            createdBy   BIGINT UNSIGNED  DEFAULT NULL,
            createdAt   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).catch(() => {});
}

function broadcastAnnouncements() {
    getActiveAnnouncements().then(list => {
        io.emit('announcements', list);
    }).catch(() => {});
}

async function getActiveAnnouncements() {
    const now = new Date();
    const [rows] = await sql.query(
        `SELECT id, message, type, link, linkText, dismissible, priority
         FROM announcements
         WHERE active = 1
           AND (startsAt IS NULL OR startsAt <= ?)
           AND (expiresAt IS NULL OR expiresAt > ?)
         ORDER BY priority DESC, id DESC`,
        [now, now]
    );
    return rows;
}

// GET all (admin view)
router.get('/', async (req, res) => {
    try {
        const [rows] = await sql.query(
            'SELECT * FROM announcements ORDER BY priority DESC, id DESC'
        );
        res.json({ success: true, data: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

// GET active (public endpoint — used by frontend on load)
router.get('/active', async (req, res) => {
    try {
        const list = await getActiveAnnouncements();
        res.json({ success: true, data: list });
    } catch (e) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

// Convert ISO string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
function toMysqlDatetime(isoString) {
    if (!isoString) return null;
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 19).replace('T', ' ');
    } catch (_) { return null; }
}

// POST create
router.post('/', async (req, res) => {
    const { message, type, link, linkText, active, dismissible, priority, startsAt, expiresAt } = req.body;

    if (!message || typeof message !== 'string' || message.length < 1 || message.length > 500)
        return res.status(400).json({ error: 'INVALID_MESSAGE' });

    const validTypes = ['info', 'success', 'warning', 'error'];
    const annType = validTypes.includes(type) ? type : 'info';
    const sanitizedLink = (link && typeof link === 'string' && link.length <= 500) ? link : null;
    const sanitizedLinkText = (linkText && typeof linkText === 'string' && linkText.length <= 100) ? linkText : null;

    try {
        const [result] = await sql.query(
            `INSERT INTO announcements (message, type, link, linkText, active, dismissible, priority, startsAt, expiresAt, createdBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                message, annType, sanitizedLink, sanitizedLinkText,
                active !== false ? 1 : 0,
                dismissible ? 1 : 0,
                parseInt(priority) || 0,
                toMysqlDatetime(startsAt),
                toMysqlDatetime(expiresAt),
                req.userId
            ]
        );

        const [rows] = await sql.query('SELECT * FROM announcements WHERE id = ?', [result.insertId]);
        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* created announcement: "${message}"`);
        broadcastAnnouncements();
        res.json({ success: true, announcement: rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

// PUT update
router.put('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'INVALID_ID' });

    const { message, type, link, linkText, active, dismissible, priority, startsAt, expiresAt } = req.body;

    const validTypes = ['info', 'success', 'warning', 'error'];
    const updates = [];
    const values = [];

    if (message !== undefined) {
        if (typeof message !== 'string' || message.length < 1 || message.length > 500)
            return res.status(400).json({ error: 'INVALID_MESSAGE' });
        updates.push('message = ?'); values.push(message);
    }
    if (type !== undefined && validTypes.includes(type)) { updates.push('type = ?'); values.push(type); }
    if (link !== undefined) { updates.push('link = ?'); values.push(link || null); }
    if (linkText !== undefined) { updates.push('linkText = ?'); values.push(linkText || null); }
    if (active !== undefined) { updates.push('active = ?'); values.push(active ? 1 : 0); }
    if (dismissible !== undefined) { updates.push('dismissible = ?'); values.push(dismissible ? 1 : 0); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(parseInt(priority) || 0); }
    if (startsAt !== undefined) { updates.push('startsAt = ?'); values.push(toMysqlDatetime(startsAt)); }
    if (expiresAt !== undefined) { updates.push('expiresAt = ?'); values.push(toMysqlDatetime(expiresAt)); }

    if (updates.length === 0) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });

    try {
        await sql.query(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);
        const [rows] = await sql.query('SELECT * FROM announcements WHERE id = ?', [id]);
        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* updated announcement #${id}`);
        broadcastAnnouncements();
        res.json({ success: true, announcement: rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'INVALID_ID' });

    try {
        await sql.query('DELETE FROM announcements WHERE id = ?', [id]);
        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* deleted announcement #${id}`);
        broadcastAnnouncements();
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

module.exports = router;
module.exports.broadcastAnnouncements = broadcastAnnouncements;
module.exports.getActiveAnnouncements = getActiveAnnouncements;
