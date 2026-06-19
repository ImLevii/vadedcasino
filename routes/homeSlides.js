const { sql } = require('../database');

const DEFAULT_HOME_SLIDES = [
    {
        title: 'DEPOSIT MATCH BONUSES',
        subtitle: 'FOR NEW AND EXISTING USERS',
        cta: 'DEPOSIT NOW',
        href: '/deposit',
        tag: '🎁 LIMITED OFFER',
        accentColor: '#1fd65f',
        sortOrder: 0
    },
    {
        title: 'EVEN BETTER FREE CASES',
        subtitle: 'GET SUPERCHARGED NOW',
        cta: 'OPEN NOW',
        href: '/cases',
        tag: '🎰 DAILY FREE',
        accentColor: '#1fd65f',
        sortOrder: 1
    },
    {
        title: 'REFER & EARN REWARDS',
        subtitle: 'INVITE FRIENDS AND EARN COMMISSION',
        cta: 'GET STARTED',
        href: '/affiliates',
        tag: '💰 EARN MORE',
        accentColor: '#1fd65f',
        sortOrder: 2
    }
];

async function ensureHomeSlidesTable() {
    await sql.query(`
        CREATE TABLE IF NOT EXISTS homeSlides (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            title VARCHAR(120) NOT NULL,
            subtitle VARCHAR(180) DEFAULT NULL,
            cta VARCHAR(60) DEFAULT NULL,
            href VARCHAR(500) DEFAULT NULL,
            tag VARCHAR(80) DEFAULT NULL,
            accentColor VARCHAR(24) NOT NULL DEFAULT '#1fd65f',
            image VARCHAR(512) DEFAULT NULL,
            backgroundImage VARCHAR(512) DEFAULT NULL,
            active TINYINT(1) NOT NULL DEFAULT 1,
            sortOrder INT NOT NULL DEFAULT 0,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_homeSlides_active_sort (active, sortOrder)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await sql.query(`
        CREATE TABLE IF NOT EXISTS homeSlideSeedState (
            seedKey VARCHAR(64) NOT NULL,
            seededAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (seedKey)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

async function seedDefaultHomeSlides() {
    await ensureHomeSlidesTable();

    const seedKey = 'default-home-slides-v1';
    const [seedRows] = await sql.query('SELECT seedKey FROM homeSlideSeedState WHERE seedKey = ? LIMIT 1', [seedKey]);
    if (seedRows.length) return false;

    let inserted = false;

    for (const slide of DEFAULT_HOME_SLIDES) {
        const [existing] = await sql.query(
            'SELECT id FROM homeSlides WHERE title = ? AND href <=> ? LIMIT 1',
            [slide.title, slide.href]
        );

        if (existing.length) continue;

        await sql.query(
            `INSERT INTO homeSlides (title, subtitle, cta, href, tag, accentColor, active, sortOrder)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                slide.title,
                slide.subtitle,
                slide.cta,
                slide.href,
                slide.tag,
                slide.accentColor,
                1,
                slide.sortOrder
            ]
        );
        inserted = true;
    }

    await sql.query('INSERT IGNORE INTO homeSlideSeedState (seedKey) VALUES (?)', [seedKey]);

    return inserted;
}

ensureHomeSlidesTable().catch(() => {});

module.exports = {
    DEFAULT_HOME_SLIDES,
    ensureHomeSlidesTable,
    seedDefaultHomeSlides
};