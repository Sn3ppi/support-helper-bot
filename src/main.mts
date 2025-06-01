import { Telegraf } from 'telegraf';

import config from "@/config.mts";
import { getUserByMsg, addUserMsg } from "@/db_client.mjs";

export const bot = new Telegraf(config.BOT_TOKEN);

bot.command('start', (ctx): void => {
  ctx.reply("Привет! Это чат-бот технической поддержки.");
});

bot.on('message', async (ctx) => {
  const userId = ctx.chat.id;
  if (ctx.chat.type === 'private') {
    try {
      const forward = await ctx.forwardMessage(config.ADMIN_CHAT);
      await addUserMsg(forward.message_id, userId);
      await ctx.reply('Сообщение отправлено.');
    } catch (err) {
      console.error(err);
      await ctx.reply('Не удалось отправить сообщение.');
    }
    return;
  };
  if (
    ctx.chat.id === Number(config.ADMIN_CHAT) &&
    ctx.message &&
    "reply_to_message" in ctx.message &&
    ctx.message.reply_to_message !== undefined
  ) {
    const repliedMsg = ctx.message.reply_to_message;
    const targetUserId = await getUserByMsg(repliedMsg.message_id);
    if (!targetUserId) {
      await ctx.reply('Не удалось определить, кому отправить сообщение.');
      return;
    };

    try {
      if ('text' in ctx.message && ctx.message.text) {
        await bot.telegram.sendMessage(targetUserId, ctx.message.text);
      } else if ('photo' in ctx.message) {
        const photo = ctx.message.photo.pop();
        await bot.telegram.sendPhoto(targetUserId, photo.file_id, { caption: ctx.message.caption || '' });
      } else if ('document' in ctx.message) {
        await bot.telegram.sendDocument(targetUserId, ctx.message.document.file_id, { caption: ctx.message.caption || '' });
      } else if ('video' in ctx.message) {
        await bot.telegram.sendVideo(targetUserId, ctx.message.video.file_id, { caption: ctx.message.caption || '' });
      } else if ('audio' in ctx.message) {
        await bot.telegram.sendAudio(targetUserId, ctx.message.audio.file_id, { caption: ctx.message.caption || '' });
      } else if ('voice' in ctx.message) {
        await bot.telegram.sendVoice(targetUserId, ctx.message.voice.file_id, { caption: ctx.message.caption || '' });
      } else if ('sticker' in ctx.message) {
        await bot.telegram.sendSticker(targetUserId, ctx.message.sticker.file_id);
      } else {
        await ctx.reply('Неизвестный тип сообщения.');
        return;
      };
      await ctx.reply('Сообщение отправлено.');
    } catch (err) {
      console.error(err);
      await ctx.reply('Не удалось отправить сообщение.');
    }
    return;
  };
});