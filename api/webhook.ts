import { json } from 'micro';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { bot } from '../src/main';
import config from '../src/config';
import { createMediaTable, createMsgTable } from "../src/db_client";

if (
  !config.BOT_TOKEN ||
  // !config.ADMIN_CHAT ||
  !config.DB_USER ||
  !config.DB_PASSWORD ||
  !config.DB_NAME ||
  !config.DB_HOST ||
  !config.DB_PORT
) 
  console.error('[webhook] Missing required environment variables');

(async () => {
  await createMsgTable();
  await createMediaTable();
})();
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      await bot.telegram.deleteWebhook({drop_pending_updates: true});
      await bot.telegram.setWebhook(`https://${req.headers.host}/api/webhook`);
      res.status(200).send(`Webhook set successfully: ${req.headers.host}`);
    } catch (err) {
      res.status(500).send("Error setting webhook");
      console.error(err);
    };
    return;
  }

  if (req.method === 'POST') {
    try {
      const update = await json(req);
      await bot.handleUpdate(update, res);
      if (!res.headersSent) 
        res.status(200).send('OK');
    } catch (error) {
      console.error('[webhook] Error handling update:', error);
      res.status(500).send('Error processing update');
    };
    return;
  }

  res.status(405).send('Method Not Allowed');
}