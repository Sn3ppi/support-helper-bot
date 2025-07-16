import { Pool } from 'pg';

import config from "./config";

/* == Когфигурация БД == */

const pool = new Pool({
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME
});

/* == Таблица ID сообщений == */

const createMsgTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS messages (
            message_id BIGINT PRIMARY KEY,
            user_id BIGINT NOT NULL
        );
    `;
    try {
        await pool.query(query);
    }
    catch (err) {
        console.error(`[ERROR] ${err}`);
        throw err;
    }
};

const getUserByMsg = async (messageId: number) => {
    const query = "SELECT user_id FROM messages WHERE message_id = $1";
    try {
        const res = await pool.query(query, [messageId]);
        if (res.rows.length > 0) {
            return res.rows[0].user_id;
        };
        return null;
    } 
    catch (err) {
        console.error(`[ERROR] ${err}`);
    }
};

const addUserMsg = async (messageId: number, userId: number): Promise<void> => {
    const query = `
        INSERT INTO messages (message_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (message_id) DO NOTHING;
    `;
    try {
        await pool.query(query, [messageId, userId]);
    }
    catch (err) {
        console.error(`[ERROR] ${err}`);
    }
};
 
/* == Таблица медиагрупп == */

const createMediaTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS media_groups (
            id SERIAL PRIMARY KEY,
            group_id TEXT NOT NULL,
            file_id TEXT NOT NULL,
            media_type TEXT NOT NULL,
            caption TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;
    try {
        await pool.query(query);
    }
    catch (err) {
        console.error(`[ERROR] ${err}`);
    }
};

const addMediaItem = async (
    groupId: string,
    media: string,
    type: string,
    caption: string | null
) => {
    await pool.query(`
        INSERT INTO media_groups (group_id, file_id, media_type, caption) VALUES ($1, $2, $3, $4)`,
        [groupId, media, type, caption]
    );
};

const getMediaGroup = async (groupId: string) => {
  const query = `
    SELECT file_id, media_type, caption
    FROM media_groups
    WHERE group_id = $1
    ORDER BY id ASC
  `;
  const res = await pool.query(query, [groupId]);
  return res.rows.map(row => {
    const media: any = {
      type: row.media_type,
      media: row.file_id
    };
    if (row.caption) media.caption = row.caption;
    return media;
  });
};

const deleteMediaGroup = async (groupId: string) => {
    await pool.query(`DELETE FROM media_groups WHERE group_id = $1`, [groupId]);
}

const getOldestTimestamp = async (groupId: string) => {
    const res = await pool.query(
        `SELECT MIN(created_at) AS oldest FROM media_groups WHERE group_id = $1`, [groupId]
    );
    return res.rows[0]?.oldest ? new Date(res.rows[0].oldest) : null;
}

export { createMsgTable, getUserByMsg, addUserMsg, createMediaTable, addMediaItem, getMediaGroup, deleteMediaGroup, getOldestTimestamp };