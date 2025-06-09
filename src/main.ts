import { Markup, Telegraf } from 'telegraf';

import config from "./config";
import { getUserByMsg, addUserMsg } from "./db_client";

export const bot = new Telegraf(config.BOT_TOKEN);

const showIDInfo = async (ctx: Context) => {
  const botId = ctx.botInfo.id; // ID этого бота
  const currentChatId = ctx.chat?.id; // ID чата, откуда вызвали команду
  const callerChatId = ctx.from?.id; // ID того, кто вызвал команду
  let text = "";
  if (currentChatId && callerChatId) {
    text = `Текущий чат:\n\n` +
               `ID чата: <code>${currentChatId}</code>\n` +
               `ID пользователя: <code>${callerChatId}</code>\n` +
               `ID бота: <code>${botId}</code>`;
    if (
      ctx.message &&
      "reply_to_message" in ctx.message &&
      ctx.message.reply_to_message !== undefined
    ) {
      const target = ctx.message.reply_to_message;
      const targetChat = target.chat;
      if (targetChat) {
        text += `\n\nПересланное сообщение:\n\n`
        const chatType = targetChat.type;
        switch (chatType) {
          case "private": {
            const targetFrom = target.from;
            if (targetFrom) {
              (targetFrom.is_bot) 
              ? `ID бота: ${target.chat.id}`
              : `ID пользователя: ${target.chat.id}`
            };
            break;
          }
          case "group": {
            const targetFrom = target.from;
            if (targetFrom) 
              text += `ID группы: ${target.chat.id}`;
            break;
          }
          case "supergroup": {
            const targetFrom = target.from;
            if (targetFrom) 
              text += `ID супергруппы: ${target.chat.id}`;
            break;
          }
          case "channel": {
            text += `ID канала: ${target.chat.id}`;
            break;
          }

        }
      }
    }
  }
  else {
    text = "Не удалось получить ID.";
  }
  return text;
}

bot.command("start", async (ctx) => {
  const text = "Привет! Это чат-бот технической поддержки.";
  (ctx.chat.type === "private")
    ? await ctx.reply(text)
    : await ctx.reply(text, { 
      reply_parameters: { message_id: ctx.message.message_id }, 
      reply_markup: (Markup.inlineKeyboard([
        Markup.button.url("Обратная связь", `https://t.me/${(await bot.telegram.getMe()).username}`)
      ])).reply_markup
    });
});

bot.command('id', async (ctx) => {
  const text = await showIDInfo(ctx);
  (ctx.chat.type === "private")
  ? await ctx.reply(text, { parse_mode: "HTML" }) 
  : await ctx.reply(text, { parse_mode: "HTML", reply_parameters: { message_id: ctx.message.message_id } });
});

bot.on('message', async (ctx) => {
  const userId = ctx.chat.id;
  if (ctx.chat.type === "private") {
    try {
      const forward = await ctx.forwardMessage(config.ADMIN_CHAT);
      await addUserMsg(forward.message_id, userId);
      await ctx.reply("Сообщение отправлено.");
    } catch (err) {
      console.error(err);
      await ctx.reply("Не удалось отправить сообщение.");
    };
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
      return; // No such requested user
    };
    try {
      if ('text' in ctx.message && ctx.message.text) {
        await bot.telegram.sendMessage(targetUserId, ctx.message.text);
      } else if ("photo" in ctx.message) {
        const photo = ctx.message.photo.pop();
        if (photo)
          await bot.telegram.sendPhoto(targetUserId, photo.file_id, { caption: ctx.message.caption || '' });
      } else if ("document" in ctx.message) {
        await bot.telegram.sendDocument(targetUserId, ctx.message.document.file_id, { caption: ctx.message.caption || '' });
      } else if ("video" in ctx.message) {
        await bot.telegram.sendVideo(targetUserId, ctx.message.video.file_id, { caption: ctx.message.caption || '' });
      } else if ("audio" in ctx.message) {
        await bot.telegram.sendAudio(targetUserId, ctx.message.audio.file_id, { caption: ctx.message.caption || '' });
      } else if ("voice" in ctx.message) {
        await bot.telegram.sendVoice(targetUserId, ctx.message.voice.file_id, { caption: ctx.message.caption || '' });
      } else if ("sticker" in ctx.message) {
        await bot.telegram.sendSticker(targetUserId, ctx.message.sticker.file_id);
      } else if ("video_note" in ctx.message) {
        await bot.telegram.sendVideoNote(targetUserId, ctx.message.video_note.file_id);
      } else {
        return; // Unhandled message type
      };
      await ctx.reply("Сообщение отправлено.", { reply_parameters: { message_id: ctx.message.message_id } });
    } catch (err) {
      console.error(err);
      await ctx.reply("Не удалось отправить сообщение.", { reply_parameters: { message_id: ctx.message.message_id } });
    };
    return;
  };
});
