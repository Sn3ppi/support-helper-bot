import { Pool } from 'pg';

import config from "@/config.mts";

const pool = new Pool({
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME
});

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

const getUserByMsg = async (messageId: number): Promise<number | null> => {
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

export { createMsgTable, getUserByMsg, addUserMsg };