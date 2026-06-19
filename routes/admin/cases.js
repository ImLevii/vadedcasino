const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const { sql, doTransaction } = require('../../database');
const { sendLog, roundDecimal } = require('../../utils');
const { cacheCases } = require('../games/cases/functions');
const { getCatalogItems } = require('../../utils/csgo/items');

const MAX_ROLL = 100000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PUBLIC_ROOT = path.join(process.cwd(), 'public');

const IMAGE_MIME_EXT = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif'
};

function parsePositiveInt(raw) {
    const value = parseInt(raw, 10);
    return Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeItemId(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' && typeof value !== 'number') return null;

    const normalized = String(value).trim();
    if (!normalized || normalized.length > 255) return null;
    return normalized;
}

function parsePrice(raw) {
    if (raw === undefined || raw === null || raw === '') return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    return roundDecimal(value);
}

function normalizeText(value, maxLen) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.length > maxLen) return null;
    return normalized;
}

function normalizeSlug(value) {
    if (typeof value !== 'string') return '';

    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function isValidSlug(slug) {
    return /^[a-z0-9-]{2,128}$/.test(slug);
}

function normalizeImage(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') return null;

    const normalized = value.trim();
    if (!normalized || normalized.length > 512) return null;

    return normalized;
}

function throwApiError(status, error) {
    const err = new Error(error);
    err.status = status;
    err.code = error;
    throw err;
}

function mapApiError(res, err) {
    if (err && err.code && err.status) {
        return res.status(err.status).json({ error: err.code });
    }

    console.error(err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
}

function isManagedLocalImagePath(imagePath) {
    return typeof imagePath === 'string' && /^\/public\/(cases|items)\//.test(imagePath);
}

function resolveManagedImagePathToDisk(imagePath) {
    if (!isManagedLocalImagePath(imagePath)) return null;

    const relativePath = imagePath.replace(/^\/public\//, '').replace(/\//g, path.sep);
    const absolutePath = path.join(PUBLIC_ROOT, relativePath);

    const normalizedRoot = path.resolve(PUBLIC_ROOT) + path.sep;
    const normalizedTarget = path.resolve(absolutePath);

    if (!normalizedTarget.startsWith(normalizedRoot)) return null;
    return normalizedTarget;
}

async function cleanupOrphanedImages(imagePaths) {
    if (!Array.isArray(imagePaths) || !imagePaths.length) return;

    const uniquePaths = [...new Set(imagePaths.filter((value) => isManagedLocalImagePath(value)))];
    if (!uniquePaths.length) return;

    for (const imagePath of uniquePaths) {
        try {
            const [[refs]] = await sql.query(
                `SELECT
                    (SELECT COUNT(*) FROM cases WHERE img = ?) AS caseRefs,
                    (SELECT COUNT(*) FROM caseItems WHERE img = ?) AS itemRefs`,
                [imagePath, imagePath]
            );

            const totalRefs = Number(refs?.caseRefs || 0) + Number(refs?.itemRefs || 0);
            if (totalRefs > 0) continue;

            const diskPath = resolveManagedImagePathToDisk(imagePath);
            if (!diskPath) continue;

            await fs.promises.unlink(diskPath).catch((err) => {
                if (err?.code !== 'ENOENT') {
                    throw err;
                }
            });
        } catch (err) {
            console.error(`Failed to cleanup orphaned image ${imagePath}:`, err.message);
        }
    }
}

function getExpectedValue(items) {
    let total = 0;

    for (const item of items) {
        const probability = (item.rangeTo - item.rangeFrom + 1) / MAX_ROLL;
        total += item.price * probability;
    }

    return roundDecimal(total);
}

function parseDataUrlImage(dataUrl) {
    if (typeof dataUrl !== 'string') return null;

    const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!matches) return null;

    const mime = matches[1].toLowerCase();
    const base64 = matches[2];
    const ext = IMAGE_MIME_EXT[mime];

    if (!ext) return null;

    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;

    return { mime, ext, buffer };
}

async function saveUploadedImage(target, fileName, dataUrl) {
    const parsed = parseDataUrlImage(dataUrl);
    if (!parsed) throwApiError(400, 'INVALID_UPLOAD_IMAGE');

    let folder;
    if (target === 'case') folder = 'cases';
    else if (target === 'item') folder = 'items';
    else throwApiError(400, 'INVALID_UPLOAD_TARGET');

    const original = typeof fileName === 'string' ? fileName : '';
    const baseName = normalizeSlug(path.parse(original).name || `img-${Date.now()}`) || `img-${Date.now()}`;
    const unique = crypto.randomBytes(4).toString('hex');
    const finalName = `${baseName}-${Date.now()}-${unique}.${parsed.ext}`;

    const dirPath = path.join(process.cwd(), 'public', folder);
    await fs.promises.mkdir(dirPath, { recursive: true });

    const pipeline = sharp(parsed.buffer).rotate().resize({
        width: 1400,
        height: 1400,
        fit: 'inside',
        withoutEnlargement: true
    });

    let outputBuffer;

    if (parsed.ext === 'png') {
        outputBuffer = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    } else if (parsed.ext === 'webp') {
        outputBuffer = await pipeline.webp({ quality: 82 }).toBuffer();
    } else if (parsed.ext === 'gif') {
        outputBuffer = await pipeline.gif().toBuffer();
    } else {
        outputBuffer = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    }

    const filePath = path.join(dirPath, finalName);
    await fs.promises.writeFile(filePath, outputBuffer);

    return `/public/${folder}/${finalName}`;
}

function normalizeItems(rawItems, mode) {
    if (!Array.isArray(rawItems) || !rawItems.length) {
        return { error: 'MISSING_ITEMS' };
    }

    const items = rawItems.map((raw, index) => {
        const name = normalizeText(raw?.name, 255);
        const price = parsePrice(raw?.price);
        const img = normalizeImage(raw?.img);

        if (!name) return { error: 'INVALID_ITEM_NAME' };
        if (!price) return { error: 'INVALID_ITEM_PRICE' };

        const itemId = normalizeItemId(raw?.itemId);
        if (raw?.itemId !== undefined && raw?.itemId !== null && raw?.itemId !== '' && !itemId) return { error: 'INVALID_ITEM_ID' };

        return {
            index,
            itemId,
            name,
            img,
            price,
            percentage: raw?.percentage,
            rangeFrom: raw?.rangeFrom,
            rangeTo: raw?.rangeTo
        };
    });

    const invalidMapped = items.find((item) => item.error);
    if (invalidMapped) return invalidMapped;

    if (mode === 'percentages') {
        let sum = 0;

        for (const item of items) {
            const pct = Number(item.percentage);
            if (!Number.isFinite(pct) || pct <= 0) return { error: 'INVALID_PERCENTAGE' };
            item.percentage = pct;
            sum += pct;
        }

        if (Math.abs(sum - 100) > 0.01) return { error: 'INVALID_PERCENTAGE_SUM' };

        const weighted = items.map((item) => {
            const exactRolls = (item.percentage / 100) * MAX_ROLL;
            const floorRolls = Math.floor(exactRolls);

            return {
                ...item,
                rolls: floorRolls,
                remainder: exactRolls - floorRolls
            };
        });

        const assigned = weighted.reduce((acc, item) => acc + item.rolls, 0);
        let left = MAX_ROLL - assigned;

        weighted
            .sort((a, b) => b.remainder - a.remainder)
            .forEach((item) => {
                if (left <= 0) return;
                item.rolls += 1;
                left -= 1;
            });

        if (weighted.some((item) => item.rolls <= 0)) return { error: 'INVALID_PERCENTAGE' };

        let cursor = 1;

        for (const item of weighted) {
            item.rangeFrom = cursor;
            item.rangeTo = cursor + item.rolls - 1;
            cursor = item.rangeTo + 1;
        }

        if (weighted[weighted.length - 1].rangeTo !== MAX_ROLL) {
            weighted[weighted.length - 1].rangeTo = MAX_ROLL;
        }

        return {
            items: weighted.sort((a, b) => a.rangeFrom - b.rangeFrom)
        };
    }

    const ranged = items.map((item) => {
        const rangeFrom = parseInt(item.rangeFrom, 10);
        const rangeTo = parseInt(item.rangeTo, 10);

        if (!Number.isInteger(rangeFrom) || !Number.isInteger(rangeTo)) {
            return { error: 'INVALID_RANGE' };
        }

        return {
            ...item,
            rangeFrom,
            rangeTo
        };
    });

    const invalidRange = ranged.find((item) => item.error);
    if (invalidRange) return invalidRange;

    ranged.sort((a, b) => a.rangeFrom - b.rangeFrom);

    let expected = 1;

    for (const item of ranged) {
        if (item.rangeFrom !== expected || item.rangeTo < item.rangeFrom || item.rangeTo > MAX_ROLL) {
            return { error: 'INVALID_RANGE' };
        }

        expected = item.rangeTo + 1;
    }

    if (expected - 1 !== MAX_ROLL) return { error: 'INVALID_RANGE_TOTAL' };

    return { items: ranged };
}

async function ensureUniqueSlug(slug, caseId = null, connection = sql) {
    const [rows] = await connection.query('SELECT id FROM cases WHERE slug = ? LIMIT 1', [slug]);
    if (!rows.length) return true;
    if (caseId && rows[0].id === caseId) return true;
    return false;
}

async function getCaseVersionContext(caseId, connection = sql) {
    const [[row]] = await connection.query(
        `SELECT c.id, c.name, c.slug, c.img,
                (
                    SELECT cv.id
                    FROM caseVersions cv
                    WHERE cv.caseId = c.id AND cv.endedAt IS NULL
                    ORDER BY cv.id DESC
                    LIMIT 1
                ) AS activeVersionId,
                (
                    SELECT cv.id
                    FROM caseVersions cv
                    WHERE cv.caseId = c.id
                    ORDER BY cv.id DESC
                    LIMIT 1
                ) AS latestVersionId
         FROM cases c
         WHERE c.id = ?
         LIMIT 1`,
        [caseId]
    );

    if (!row) return null;

    return {
        ...row,
        editableVersionId: row.activeVersionId || row.latestVersionId || null
    };
}

async function hasOpeningsForVersion(caseVersionId, connection = sql) {
    const [[row]] = await connection.query('SELECT id FROM caseOpenings WHERE caseVersionId = ? LIMIT 1', [caseVersionId]);
    return !!row;
}

async function hasOpeningsForCase(caseId, connection = sql) {
    const [[row]] = await connection.query(
        `SELECT co.id
         FROM caseOpenings co
         INNER JOIN caseVersions cv ON cv.id = co.caseVersionId
         WHERE cv.caseId = ?
         LIMIT 1`,
        [caseId]
    );

    return !!row;
}

async function createCaseVersion(connection, caseId, items, requestedPrice, activeVersionIdToEnd = null) {
    const computedPrice = getExpectedValue(items);
    const finalPrice = requestedPrice || computedPrice;

    if (!finalPrice) throwApiError(400, 'INVALID_PRICE');

    if (activeVersionIdToEnd) {
        await connection.query('UPDATE caseVersions SET endedAt = NOW() WHERE id = ?', [activeVersionIdToEnd]);
    }

    const [versionInsert] = await connection.query(
        'INSERT INTO caseVersions (caseId, price) VALUES (?, ?)',
        [caseId, finalPrice]
    );

    for (const item of items) {
        await connection.query(
            `INSERT INTO caseItems (caseVersionId, itemId, name, img, price, rangeFrom, rangeTo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [versionInsert.insertId, item.itemId, item.name, item.img, item.price, item.rangeFrom, item.rangeTo]
        );
    }

    return {
        versionId: versionInsert.insertId,
        computedPrice,
        finalPrice
    };
}

async function refreshCaseCache() {
    try {
        await cacheCases();
    } catch (e) {
        console.error('Failed to refresh case cache', e);
    }
}

router.post('/upload', async (req, res) => {
    try {
        const path = await saveUploadedImage(req.body?.target, req.body?.fileName, req.body?.dataUrl);
        return res.json({ success: true, data: { path } });
    } catch (err) {
        return mapApiError(res, err);
    }
});

router.get('/catalog', async (req, res) => {
    try {
        const data = getCatalogItems()
            .map((item) => ({
                itemId: normalizeItemId(item?.itemId || item?.id),
                marketHashName: item?.marketHashName || null,
                name: item?.name || '',
                img: item?.img || null,
                price: roundDecimal(Number(item?.price || 0)),
                type: item?.type || null,
                weapon: item?.weapon || null,
                exterior: item?.exterior || null,
                rarity: item?.rarity || null,
                collection: item?.collection || null,
                isStatTrak: !!item?.isStatTrak,
                isSouvenir: !!item?.isSouvenir,
                source: item?.source || 'steam-community-market'
            }))
            .filter((item) => item.itemId && item.name && item.price > 0)
            .sort((a, b) => Number(b.price || 0) - Number(a.price || 0));

        return res.json({ success: true, data });
    } catch (err) {
        return mapApiError(res, err);
    }
});

router.get('/', async (req, res) => {
    try {
        const [rows] = await sql.query(`
            SELECT c.id, c.name, c.slug, c.img,
                   COALESCE(
                       (
                           SELECT cv.id
                           FROM caseVersions cv
                           WHERE cv.caseId = c.id AND cv.endedAt IS NULL
                           ORDER BY cv.id DESC
                           LIMIT 1
                       ),
                       (
                           SELECT cv.id
                           FROM caseVersions cv
                           WHERE cv.caseId = c.id
                           ORDER BY cv.id DESC
                           LIMIT 1
                       )
                   ) AS versionId,
                   COALESCE(
                       (
                           SELECT cv.price
                           FROM caseVersions cv
                           WHERE cv.caseId = c.id AND cv.endedAt IS NULL
                           ORDER BY cv.id DESC
                           LIMIT 1
                       ),
                       (
                           SELECT cv.price
                           FROM caseVersions cv
                           WHERE cv.caseId = c.id
                           ORDER BY cv.id DESC
                           LIMIT 1
                       )
                   ) AS price,
                   COALESCE(
                       (
                           SELECT cv.createdAt
                           FROM caseVersions cv
                           WHERE cv.caseId = c.id AND cv.endedAt IS NULL
                           ORDER BY cv.id DESC
                           LIMIT 1
                       ),
                       (
                           SELECT cv.createdAt
                           FROM caseVersions cv
                           WHERE cv.caseId = c.id
                           ORDER BY cv.id DESC
                           LIMIT 1
                       )
                   ) AS createdAt,
                   (
                       SELECT COUNT(*)
                       FROM caseItems ci
                       WHERE ci.caseVersionId = COALESCE(
                           (
                               SELECT cv.id
                               FROM caseVersions cv
                               WHERE cv.caseId = c.id AND cv.endedAt IS NULL
                               ORDER BY cv.id DESC
                               LIMIT 1
                           ),
                           (
                               SELECT cv.id
                               FROM caseVersions cv
                               WHERE cv.caseId = c.id
                               ORDER BY cv.id DESC
                               LIMIT 1
                           )
                       )
                   ) AS itemCount,
                   (SELECT COUNT(*) FROM caseVersions cv2 WHERE cv2.caseId = c.id) AS versionCount,
                   (SELECT COUNT(*) FROM caseOpenings co INNER JOIN caseVersions cv3 ON cv3.id = co.caseVersionId WHERE cv3.caseId = c.id) AS openingCount
            FROM cases c
            ORDER BY c.id DESC
        `);

        return res.json({ success: true, data: rows });
    } catch (err) {
        return mapApiError(res, err);
    }
});

router.get('/:id', async (req, res) => {
    const caseId = parsePositiveInt(req.params.id);
    if (!caseId) return res.status(400).json({ error: 'INVALID_ID' });

    try {
        const [[caseRow]] = await sql.query('SELECT id, name, slug, img FROM cases WHERE id = ? LIMIT 1', [caseId]);
        if (!caseRow) return res.status(404).json({ error: 'NOT_FOUND' });

        const [versions] = await sql.query(
            `SELECT id, caseId, price, endedAt, createdAt,
                    (SELECT COUNT(*) FROM caseOpenings co WHERE co.caseVersionId = caseVersions.id) AS openingCount,
                    (SELECT COUNT(*) FROM caseItems ci WHERE ci.caseVersionId = caseVersions.id) AS itemCount
             FROM caseVersions
             WHERE caseId = ?
             ORDER BY id DESC`,
            [caseId]
        );

        const versionIds = versions.map((version) => version.id);
        const [items] = await sql.query(
            `SELECT id, caseVersionId, itemId, name, img, price, rangeFrom, rangeTo
             FROM caseItems
             WHERE caseVersionId IN (?)
             ORDER BY caseVersionId DESC, rangeFrom ASC`,
            [versionIds.length ? versionIds : [0]]
        );

        const versionsWithItems = versions.map((version) => ({
            ...version,
            items: items
                .filter((item) => item.caseVersionId === version.id)
                .map((item) => ({
                    ...item,
                    probability: roundDecimal(((item.rangeTo - item.rangeFrom + 1) / MAX_ROLL) * 100, 3)
                }))
        }));

        const activeVersion = versionsWithItems.find((version) => !version.endedAt) || versionsWithItems[0] || null;
        const stats = activeVersion
            ? {
                expectedValue: getExpectedValue(activeVersion.items),
                houseEdge: activeVersion.price > 0
                    ? roundDecimal((1 - (getExpectedValue(activeVersion.items) / activeVersion.price)) * 100, 4)
                    : 0
            }
            : {
                expectedValue: 0,
                houseEdge: 0
            };

        return res.json({
            success: true,
            data: {
                ...caseRow,
                activeVersion,
                versions: versionsWithItems,
                stats
            }
        });
    } catch (err) {
        return mapApiError(res, err);
    }
});

router.post('/', async (req, res) => {
    const name = normalizeText(req.body?.name, 255);
    const slug = normalizeSlug(req.body?.slug || req.body?.name || '');
    const img = normalizeImage(req.body?.img);
    const mode = req.body?.mode === 'percentages' ? 'percentages' : 'ranges';

    if (!name) return res.status(400).json({ error: 'INVALID_NAME' });
    if (!isValidSlug(slug)) return res.status(400).json({ error: 'INVALID_SLUG' });

    const normalizedItems = normalizeItems(req.body?.items, mode);
    if (normalizedItems.error) return res.status(400).json({ error: normalizedItems.error });

    const requestedPrice = parsePrice(req.body?.price);

    try {
        let created;

        await doTransaction(async (connection, commit) => {
            const unique = await ensureUniqueSlug(slug, null, connection);
            if (!unique) throwApiError(400, 'SLUG_ALREADY_EXISTS');

            const [caseInsert] = await connection.query(
                'INSERT INTO cases (name, slug, img) VALUES (?, ?, ?)',
                [name, slug, img]
            );

            const createdVersion = await createCaseVersion(connection, caseInsert.insertId, normalizedItems.items, requestedPrice, null);

            created = {
                id: caseInsert.insertId,
                versionId: createdVersion.versionId,
                name,
                slug,
                img,
                price: createdVersion.finalPrice,
                computedPrice: createdVersion.computedPrice
            };

            await commit();
        });

        await refreshCaseCache();

        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* created case *${name}* (${slug}).`);
        return res.json({ success: true, data: created });
    } catch (err) {
        return mapApiError(res, err);
    }
});

router.put('/:id', async (req, res) => {
    const caseId = parsePositiveInt(req.params.id);
    if (!caseId) return res.status(400).json({ error: 'INVALID_ID' });

    try {
        const staleImages = new Set();

        await doTransaction(async (connection, commit) => {
            const context = await getCaseVersionContext(caseId, connection);
            if (!context) throwApiError(404, 'NOT_FOUND');

            const updates = [];
            const values = [];

            if (req.body?.name !== undefined) {
                const name = normalizeText(req.body.name, 255);
                if (!name) throwApiError(400, 'INVALID_NAME');
                updates.push('name = ?');
                values.push(name);
            }

            if (req.body?.slug !== undefined) {
                const slug = normalizeSlug(req.body.slug);
                if (!isValidSlug(slug)) throwApiError(400, 'INVALID_SLUG');
                const unique = await ensureUniqueSlug(slug, caseId, connection);
                if (!unique) throwApiError(400, 'SLUG_ALREADY_EXISTS');
                updates.push('slug = ?');
                values.push(slug);
            }

            if (req.body?.img !== undefined) {
                const img = normalizeImage(req.body.img);
                if (req.body.img && !img) throwApiError(400, 'INVALID_IMAGE');

                if (context.img && context.img !== img && isManagedLocalImagePath(context.img)) {
                    staleImages.add(context.img);
                }

                updates.push('img = ?');
                values.push(img);
            }

            if (updates.length) {
                await connection.query(`UPDATE cases SET ${updates.join(', ')} WHERE id = ?`, [...values, caseId]);
            }

            const hasItemsPayload = req.body?.items !== undefined;
            const hasPricePayload = req.body?.price !== undefined;

            if (hasItemsPayload || hasPricePayload) {
                if (!context.editableVersionId) {
                    throwApiError(400, 'NOT_FOUND');
                }

                const referenced = await hasOpeningsForVersion(context.editableVersionId, connection);

                if (hasItemsPayload) {
                    const mode = req.body?.mode === 'percentages' ? 'percentages' : 'ranges';
                    const normalizedItems = normalizeItems(req.body.items, mode);
                    if (normalizedItems.error) throwApiError(400, normalizedItems.error);

                    const requestedPrice = parsePrice(req.body?.price);

                    if (referenced) {
                        const newVersion = await createCaseVersion(
                            connection,
                            caseId,
                            normalizedItems.items,
                            requestedPrice,
                            context.activeVersionId || null
                        );

                        if (!context.activeVersionId && context.latestVersionId) {
                            await connection.query('UPDATE caseVersions SET endedAt = NOW() WHERE id = ?', [context.latestVersionId]);
                        }

                        void newVersion;
                    } else {
                        const [existingItems] = await connection.query(
                            `SELECT img
                             FROM caseItems
                             WHERE caseVersionId = ?`,
                            [context.editableVersionId]
                        );

                        await connection.query('DELETE FROM caseItems WHERE caseVersionId = ?', [context.editableVersionId]);

                        for (const item of normalizedItems.items) {
                            await connection.query(
                                `INSERT INTO caseItems (caseVersionId, itemId, name, img, price, rangeFrom, rangeTo)
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [context.editableVersionId, item.itemId, item.name, item.img, item.price, item.rangeFrom, item.rangeTo]
                            );
                        }

                        const nextImages = new Set(normalizedItems.items.map((item) => item.img).filter(Boolean));
                        for (const row of existingItems) {
                            const oldImg = row?.img;
                            if (!oldImg || nextImages.has(oldImg)) continue;
                            if (isManagedLocalImagePath(oldImg)) staleImages.add(oldImg);
                        }

                        const computedPrice = getExpectedValue(normalizedItems.items);
                        const finalPrice = requestedPrice || computedPrice;
                        if (!finalPrice) throwApiError(400, 'INVALID_PRICE');

                        await connection.query('UPDATE caseVersions SET price = ? WHERE id = ?', [finalPrice, context.editableVersionId]);
                    }
                } else {
                    const finalPrice = parsePrice(req.body.price);
                    if (!finalPrice) throwApiError(400, 'INVALID_PRICE');

                    if (referenced) {
                        const [existingItems] = await connection.query(
                            `SELECT itemId, name, img, price, rangeFrom, rangeTo
                             FROM caseItems
                             WHERE caseVersionId = ?
                             ORDER BY rangeFrom ASC`,
                            [context.editableVersionId]
                        );

                        if (!existingItems.length) throwApiError(400, 'MISSING_ITEMS');

                        await createCaseVersion(
                            connection,
                            caseId,
                            existingItems,
                            finalPrice,
                            context.activeVersionId || null
                        );

                        if (!context.activeVersionId && context.latestVersionId) {
                            await connection.query('UPDATE caseVersions SET endedAt = NOW() WHERE id = ?', [context.latestVersionId]);
                        }
                    } else {
                        await connection.query('UPDATE caseVersions SET price = ? WHERE id = ?', [finalPrice, context.editableVersionId]);
                        await cleanupOrphanedImages([...staleImages]);
                    }
                }
            }

            if (!updates.length && !hasItemsPayload && !hasPricePayload) {
                throwApiError(400, 'NOTHING_TO_UPDATE');
            }

            await commit();
        });

        await refreshCaseCache();

        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* updated case #${caseId}.`);
        return res.json({ success: true });
    } catch (err) {
        return mapApiError(res, err);
    }
});

router.post('/:id/version', async (req, res) => {
    const caseId = parsePositiveInt(req.params.id);
    if (!caseId) return res.status(400).json({ error: 'INVALID_ID' });

    const mode = req.body?.mode === 'percentages' ? 'percentages' : 'ranges';
    const normalizedItems = normalizeItems(req.body?.items, mode);
    if (normalizedItems.error) return res.status(400).json({ error: normalizedItems.error });

    const requestedPrice = parsePrice(req.body?.price);

    try {
        let createdVersion = null;

        await doTransaction(async (connection, commit) => {
            const context = await getCaseVersionContext(caseId, connection);
            if (!context) throwApiError(404, 'NOT_FOUND');

            createdVersion = await createCaseVersion(
                connection,
                caseId,
                normalizedItems.items,
                requestedPrice,
                context.activeVersionId || null
            );

            if (!context.activeVersionId && context.latestVersionId) {
                await connection.query('UPDATE caseVersions SET endedAt = NOW() WHERE id = ?', [context.latestVersionId]);
            }

            await commit();
        });

        await refreshCaseCache();

        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* created new version for case #${caseId}.`);
        return res.json({
            success: true,
            data: {
                versionId: createdVersion.versionId,
                price: createdVersion.finalPrice,
                computedPrice: createdVersion.computedPrice
            }
        });
    } catch (err) {
        return mapApiError(res, err);
    }
});

router.delete('/:id', async (req, res) => {
    const caseId = parsePositiveInt(req.params.id);
    if (!caseId) return res.status(400).json({ error: 'INVALID_ID' });

    try {
        const staleImages = new Set();

        await doTransaction(async (connection, commit) => {
            const [[existingCase]] = await connection.query('SELECT id, name FROM cases WHERE id = ? LIMIT 1', [caseId]);
            if (!existingCase) throwApiError(404, 'NOT_FOUND');

            const referenced = await hasOpeningsForCase(caseId, connection);
            if (referenced) throwApiError(400, 'CASE_HAS_OPENINGS');

            const [versions] = await connection.query('SELECT id FROM caseVersions WHERE caseId = ?', [caseId]);
            const versionIds = versions.map((version) => version.id);

            if (existingCase.img && isManagedLocalImagePath(existingCase.img)) {
                staleImages.add(existingCase.img);
            }

            if (versionIds.length) {
                const [existingItems] = await connection.query(
                    'SELECT img FROM caseItems WHERE caseVersionId IN (?)',
                    [versionIds]
                );

                for (const row of existingItems) {
                    if (row?.img && isManagedLocalImagePath(row.img)) {
                        staleImages.add(row.img);
                    }
                }

                await connection.query('DELETE FROM caseItems WHERE caseVersionId IN (?)', [versionIds]);
            }

            await connection.query('DELETE FROM caseVersions WHERE caseId = ?', [caseId]);
            await connection.query('DELETE FROM cases WHERE id = ?', [caseId]);

            await commit();

            sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* deleted case #${caseId} (${existingCase.name}).`);
        });

        await refreshCaseCache();
        await cleanupOrphanedImages([...staleImages]);
        return res.json({ success: true });
    } catch (err) {
        return mapApiError(res, err);
    }
});

module.exports = router;
