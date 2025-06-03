import { Telegraf } from 'telegraf';
import config from "./config";
import { getUserByMsg, addUserMsg } from "./db_client";

export const bot = new Telegraf(config.BOT_TOKEN);

const isPrivate = (ctx) => {
  return ctx.chat.type === 'private';
};

bot.command('start', async (ctx) => {
  const text = "Привет! Это чат-бот технической поддержки.";
  (isPrivate(ctx))
    ? await ctx.reply(text)
    : await ctx.reply(text, { reply_to_message_id: ctx.message.message_id });
});

bot.command('id', async (ctx) => {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  const botId = ctx.botInfo.id;
  if (chatId && userId) {
    const infoText =
      `ID чата: <code>${chatId}</code>\n` +
      `ID пользователя: <code>${userId}</code>\n` +
      `ID бота: <code>${botId}</code>`;
    (isPrivate(ctx))
      ? await ctx.reply(infoText, { parse_mode: "HTML" })
      : await ctx.reply(infoText, { parse_mode: "HTML", reply_to_message_id: ctx.message.message_id })
  } else {
    (isPrivate(ctx))
      ? await ctx.reply("Не удалось получить ID.")
      : await ctx.reply("Не удалось получить ID.", { reply_to_message_id: ctx.message.message_id });
  }
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
  }
  if (
    ctx.chat.id === Number(config.ADMIN_CHAT) &&
    ctx.message &&
    "reply_to_message" in ctx.message &&
    ctx.message.reply_to_message !== undefined
  ) {
    const repliedMsg = ctx.message.reply_to_message;
    const targetUserId = await getUserByMsg(repliedMsg.message_id);
    if (!targetUserId) {
      await ctx.reply('Не удалось определить, кому отправить сообщение.', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    try {
      if ('text' in ctx.message && ctx.message.text) {
        await bot.telegram.sendMessage(targetUserId, ctx.message.text);
      } else if ('photo' in ctx.message) {
        const photo = ctx.message.photo.pop();
        if (photo) 
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
        await ctx.reply('Неизвестный тип сообщения.', { reply_to_message_id: ctx.message.message_id });
        return;
      }
      await ctx.reply('Сообщение отправлено.', { reply_to_message_id: ctx.message.message_id });
    } catch (err) {
      console.error(err);
      await ctx.reply('Не удалось отправить сообщение.', { reply_to_message_id: ctx.message.message_id });
    }
    return;
  };
});
