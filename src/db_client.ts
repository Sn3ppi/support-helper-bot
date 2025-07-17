import { Pool } from 'pg';

import config from "./config";
import { media_group } from '@dietime/telegraf-media-group';

/* == Когфигурация БД == */

const pool = new Pool({
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME
});

/* == Таблица ID сообщений == */

const createMsgTable = async (): Promise<void> => {
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

const getUserByMsg = async (messageId: number): Promise<any> => {
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

const createMediaTable = async (): Promise<void> => {
    const query = `
        CREATE TABLE IF NOT EXISTS media_groups (
            id SERIAL PRIMARY KEY,
            media_group_id TEXT NOT NULL,
            message_id BIGINT NOT NULL,
            chat_id BIGINT NOT NULL,
            file_id TEXT NOT NULL,
            type TEXT NOT NULL,
            caption TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `;
    try {
        await pool.query(query);
    }
    catch (err) {
        console.error(`[ERROR] ${err}`);
    };
};

const addMediaGroupItem = async (
  media_group_id: string,
  message_id: number,
  chat_id: number,
  type: string,
  file_id: string,
  caption?: string
): Promise<void> => {
    const query = `
        INSERT INTO media_groups
        (media_group_id, message_id, chat_id, type, file_id, caption)
        VALUES ($1, $2, $3, $4, $5, $6)
    `;
    try {
        await pool.query(
            query, [
                media_group_id, 
                message_id, 
                chat_id, 
                type, 
                file_id, 
                caption || null
            ]
        );
    }
    catch (err) {
        console.error(`[ERROR] ${err}`);
    };
};

const editMediaGroupItem = async (
    media_group_id: string,
    message_id: number,
    file_id: string,
    caption: string
): Promise<void> => {
    const query = `
        UPDATE media_items
        SET caption = $1
        WHERE media_group_id = $2
        AND message_id = $3
        AND file_id = $4
    `;
    try {
        await pool.query(query, [
            caption,
            media_group_id,
            message_id,
            file_id
        ]);
    } catch (err) {
        console.error(`[ERROR] ${err}`);
    };
};

const getMediaGroup = async (media_group_id: string): Promise<any[] | undefined> => {
    const query = `
        SELECT *
        FROM media_groups
        WHERE media_group_id = $1
        ORDER BY id ASC
    `;
    try {
        const { rows } = await pool.query(query, [media_group_id]);
        return rows;
    }
    catch (err) {
        console.error(`[ERROR] ${err}`);
    };
};

export { createMsgTable, getUserByMsg, addUserMsg, createMediaTable, addMediaGroupItem, getMediaGroup, editMediaGroupItem };