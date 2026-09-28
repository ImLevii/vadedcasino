async function save(folder, name, buffer) {
    if (buffer.length > 3 * 1024 * 1024) {
        const error = new Error('IMAGE_TOO_LARGE');
        Object.assign(error, { code: 'IMAGE_TOO_LARGE', status: 413 });
        throw error;
    }
    const id = `/public/media/${folder}/${name}`;
    const ext = name.split('.').pop();
    const mime = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext];
    if (!mime) throw new Error('Unsupported image type');
    await require('../database').sql.query('INSERT INTO runtimeMedia (id, mime, data) VALUES (?, ?, ?)', [id, mime, buffer.toString('base64')]);
    return id;
}
async function serve(req, res) {
    const [[image]] = await require('../database').sql.query('SELECT mime, data FROM runtimeMedia WHERE id = ?', [req.path]);
    if (!image) return res.status(404).end();
    res.type(image.mime).set('Cache-Control', 'public, max-age=31536000, immutable').send(Buffer.from(image.data, 'base64'));
}
module.exports = { save, serve };
