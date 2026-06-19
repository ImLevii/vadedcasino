const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const { sql } = require('../../database');
const { sendLog } = require('../../utils');
const { seedDefaultHomeSlides } = require('../homeSlides');

const router = express.Router();
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_MIME_EXT = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif'
};

function normalizeText(value, maxLength, required = false) {
    if (value === undefined || value === null || value === '') return required ? null : null;
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.length > maxLength) return required ? null : null;
    return normalized;
}

function normalizeUrl(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.length > 500) return null;
    if (normalized.startsWith('/') || normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    return null;
}

function normalizeImage(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.length > 512) return null;
    if (normalized.startsWith('/public/') || normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    return null;
}

function normalizeColor(value) {
    if (typeof value !== 'string') return '#1fd65f';
    const normalized = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized;
    return '#1fd65f';
}

function parseDataUrlImage(dataUrl) {
    if (typeof dataUrl !== 'string') return null;
    const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!matches) return null;

    const mime = matches[1].toLowerCase();
    const ext = IMAGE_MIME_EXT[mime];
    if (!ext) return null;

    const buffer = Buffer.from(matches[2], 'base64');
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;

    return { ext, buffer };
}

function slugify(value) {
    return (value || 'slide')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') || 'slide';
}

async function saveUploadedImage(fileName, dataUrl) {
    const parsed = parseDataUrlImage(dataUrl);
    if (!parsed) {
        const err = new Error('INVALID_UPLOAD_IMAGE');
        err.status = 400;
        err.code = 'INVALID_UPLOAD_IMAGE';
        throw err;
    }

    const dirPath = path.join(process.cwd(), 'public', 'slides');
    await fs.promises.mkdir(dirPath, { recursive: true });

    const baseName = slugify(path.parse(typeof fileName === 'string' ? fileName : '').name);
    const finalName = `${baseName}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${parsed.ext}`;
    const filePath = path.join(dirPath, finalName);

    const pipeline = sharp(parsed.buffer).rotate().resize({
        width: 1800,
        height: 900,
        fit: 'inside',
        withoutEnlargement: true
    });

    let outputBuffer;
    if (parsed.ext === 'png') outputBuffer = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    else if (parsed.ext === 'webp') outputBuffer = await pipeline.webp({ quality: 84 }).toBuffer();
    else if (parsed.ext === 'gif') outputBuffer = await pipeline.gif().toBuffer();
    else outputBuffer = await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer();

    await fs.promises.writeFile(filePath, outputBuffer);
    return `/public/slides/${finalName}`;
}

function mapError(res, err) {
    if (err?.code && err?.status) return res.status(err.status).json({ error: err.code });
    console.error(err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
}

function buildSlidePayload(body, partial = false) {
    const payload = {};

    if (!partial || body.title !== undefined) {
        const title = normalizeText(body.title, 120, true);
        if (!title) return { error: 'INVALID_TITLE' };
        payload.title = title;
    }

    if (!partial || body.subtitle !== undefined) payload.subtitle = normalizeText(body.subtitle, 180, false);
    if (!partial || body.cta !== undefined) payload.cta = normalizeText(body.cta, 60, false);

    if (!partial || body.href !== undefined) {
        const href = normalizeUrl(body.href);
        if (body.href && !href) return { error: 'INVALID_HREF' };
        payload.href = href;
    }

    if (!partial || body.tag !== undefined) payload.tag = normalizeText(body.tag, 80, false);
    if (!partial || body.accentColor !== undefined) payload.accentColor = normalizeColor(body.accentColor);

    if (!partial || body.image !== undefined) {
        const image = normalizeImage(body.image);
        if (body.image && !image) return { error: 'INVALID_IMAGE' };
        payload.image = image;
    }

    if (!partial || body.backgroundImage !== undefined) {
        const backgroundImage = normalizeImage(body.backgroundImage);
        if (body.backgroundImage && !backgroundImage) return { error: 'INVALID_IMAGE' };
        payload.backgroundImage = backgroundImage;
    }

    if (!partial || body.active !== undefined) payload.active = body.active === false ? 0 : 1;
    if (!partial || body.sortOrder !== undefined) payload.sortOrder = parseInt(body.sortOrder, 10) || 0;

    return { payload };
}

router.post('/upload', async (req, res) => {
    try {
        const imagePath = await saveUploadedImage(req.body?.fileName, req.body?.dataUrl);
        return res.json({ success: true, data: { path: imagePath } });
    } catch (err) {
        return mapError(res, err);
    }
});

router.get('/', async (req, res) => {
    try {
        await seedDefaultHomeSlides();

        const [rows] = await sql.query('SELECT * FROM homeSlides ORDER BY sortOrder ASC, id ASC');
        return res.json({ success: true, data: rows });
    } catch (err) {
        return mapError(res, err);
    }
});

router.post('/', async (req, res) => {
    const built = buildSlidePayload(req.body || {}, false);
    if (built.error) return res.status(400).json({ error: built.error });

    const payload = built.payload;

    try {
        const [result] = await sql.query(
            `INSERT INTO homeSlides (title, subtitle, cta, href, tag, accentColor, image, backgroundImage, active, sortOrder)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [payload.title, payload.subtitle, payload.cta, payload.href, payload.tag, payload.accentColor, payload.image, payload.backgroundImage, payload.active, payload.sortOrder]
        );

        const [[slide]] = await sql.query('SELECT * FROM homeSlides WHERE id = ?', [result.insertId]);
        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* created home slider slide #${result.insertId}.`);
        return res.json({ success: true, data: slide });
    } catch (err) {
        return mapError(res, err);
    }
});

router.put('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'INVALID_ID' });

    const built = buildSlidePayload(req.body || {}, true);
    if (built.error) return res.status(400).json({ error: built.error });

    const entries = Object.entries(built.payload);
    if (!entries.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });

    try {
        const [existing] = await sql.query('SELECT id FROM homeSlides WHERE id = ? LIMIT 1', [id]);
        if (!existing.length) return res.status(404).json({ error: 'NOT_FOUND' });

        const columns = entries.map(([key]) => `${key} = ?`).join(', ');
        const values = entries.map(([, value]) => value);

        await sql.query(`UPDATE homeSlides SET ${columns} WHERE id = ?`, [...values, id]);
        const [[slide]] = await sql.query('SELECT * FROM homeSlides WHERE id = ?', [id]);
        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* updated home slider slide #${id}.`);
        return res.json({ success: true, data: slide });
    } catch (err) {
        return mapError(res, err);
    }
});

router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'INVALID_ID' });

    try {
        await sql.query('DELETE FROM homeSlides WHERE id = ?', [id]);
        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* deleted home slider slide #${id}.`);
        return res.json({ success: true });
    } catch (err) {
        return mapError(res, err);
    }
});

module.exports = router;
