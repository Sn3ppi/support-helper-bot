import { Context, Markup, Telegraf, Telegram } from 'telegraf';

import config from "./config";
import { getUserByMsg, addUserMsg, getMediaGroup, addMediaGroup } from "./db_client";
import { Message } from '@telegraf/types/message';

export const bot = new Telegraf(config.BOT_TOKEN);

const feedBackKb = async () => {
  return (Markup.inlineKeyboard([
    Markup.button.url("Обратная связь", `https://t.me/${(await bot.telegram.getMe()).username}`)
  ])).reply_markup
}

const showIDInfo = async (ctx: Context) => {
  const botId = ctx.botInfo.id; // ID этого бота
  let text = "";
  if (ctx.chat && ctx.from) {
    const currentChatId = ctx.chat.id; // ID чата, откуда вызвали команду
    const callerChatId = ctx.from.id; // ID того, кто вызвал команду
    if (currentChatId && callerChatId) {
      text = `ℹ️ <b>Текущий чат:</b>\n\n` +
                `💬 ID чата: <code>${currentChatId}</code>\n` +
                `👤 ID пользователя: <code>${callerChatId}</code>\n` +
                `🤖 ID бота: <code>${botId}</code>`;
      if (
        ctx.message &&
        "reply_to_message" in ctx.message &&
        ctx.message.reply_to_message !== undefined
      ) {
        const target = ctx.message.reply_to_message;
        if (target) { 
          if ("forward_origin" in target) { // Данные отправителя пересланного сообщения
            const forwarded = target.forward_origin;
            if (forwarded) {
              text += "\n\nℹ️ <b>Пересланное сообщение:</b>\n\n";
              const targetChatType = forwarded.type;
              switch (targetChatType) {
                case "user": { // Пользователь / Бот
                  const sender = forwarded.sender_user;
                  text += "Тип: " + (
                    (sender.is_bot) 
                    ? "🤖 Бот\n" 
                    : "👤 Пользователь\n"
                  ) +
                  `ID: <code>${sender.id}</code>\n` +
                  `Имя: <i>${sender.first_name}</i>\n`;
                  if (sender.last_name)
                    text += `Фамилия: <i>${sender.last_name}</i>\n`;
                  if (sender.username) 
                    text += `Тег: @${sender.username}\n`;
                  break;        
                }
                case "hidden_user": { // Пользователь с закрытым профилем
                  text += "Тип: 👤 Скрытый пользователь\n" +
                          `Имя пользователя: ${forwarded.sender_user_name}`;
                  break;
                }
                case "channel": { // Канал
                  const sender = forwarded.chat;
                  const subType = sender.type;
                  switch (subType) {
                    case "channel":
                      text += "Тип: 📬 Канал\n" +
                              `ID: <code>${sender.id}</code>\n` +
                              `Название: <i>${sender.title}</i>\n`;
                      if (sender.username)
                        text += `Тег: @${sender.username}`;
                      break;
                  }
                  if (forwarded.author_signature) 
                    text += `Автор: <i>${forwarded.author_signature}</i>\n`;
                  break;
                }
                case "chat": { // Чат
                  const sender = forwarded.sender_chat;
                  const subType = sender.type;
                  switch (subType) {
                    case "group": { // Чат (группа)
                      text += "Тип: 💬 Чат (группа)\n" +
                              `ID: <code>${sender.id}</code>\n` +
                              `Название: <i>${sender.title}</i>\n`;
                      break;
                    };
                    case "supergroup": { // Чат (супергруппа)
                      text += "Тип: 💬 Чат (супергруппа)\n" +
                              `ID: <code>${sender.id}</code>\n` +
                              `Название: <i>${sender.title}</i>\n`;
                      if (sender.username) 
                        text += `Тег: @${sender.username}\n`;
                      break;
                    };
                  }
                  break;
                }
              }
            }
          }
        }
      }
    }
    else {
      text = "Не удалось получить ID.";
    }
  };
  return text;
};

bot.command("start", async (ctx: Context) => {
  const text = "Привет! Это чат-бот технической поддержки.";
  if (ctx.chat && ctx.message) {
  (ctx.chat.type === "private")
    ? await ctx.reply(text)
    : await ctx.reply(text, { 
      reply_parameters: { message_id: ctx.message.message_id }, 
      reply_markup: await feedBackKb()
    });
  };
});

bot.command('post', async (ctx) => {
  const targetId = Number(config.ADMIN_CHANNEL);
  if (ctx.chat && ctx.message) {
    if (ctx.chat.id === Number(config.ADMIN_CHAT)) { // Команда доступна только администрации
      if (targetId) { // Канал администрации указан?
        if (
          "reply_to_message" in ctx.message &&
           ctx.message.reply_to_message !== undefined
        ) {
          try {
            //await bot.telegram.copyMessage(targetId, ctx.message.reply_to_message.chat.id, ctx.message.reply_to_message.message_id); // <-----
            await ctx.reply("Сообщение отправлено в канал.", { reply_parameters: { message_id: ctx.message.message_id } });
          } catch (err) {
            console.error(err);
            await ctx.reply("Не удалось отправить сообщение в канал.", { reply_parameters: { message_id: ctx.message.message_id } });
          };
        }
        else {
          await ctx.reply(`Выберите сообщение и ответьте на него командой /post@${(await bot.telegram.getMe()).username} для отправки на канал.`, 
            { reply_parameters: { message_id: ctx.message.message_id } }
          );
        }
      }
      else {
        await ctx.reply(
          `Укажите ID канала в конфигурационном файле.\n` +
          `Чтобы узнать ID канала, отправьте сообщение из него боту и ответьте на него командой /id@${(await bot.telegram.getMe()).username}.`,
           { reply_parameters: { message_id: ctx.message.message_id } }
          );
      }
    }
  }
})

bot.command('id', async (ctx: Context) => {
  const text = await showIDInfo(ctx);
  if (ctx.chat && ctx.message) {
    (ctx.chat.type === "private")
    ? await ctx.reply(text, { parse_mode: "HTML" }) 
    : await ctx.reply(text, { parse_mode: "HTML", reply_parameters: { message_id: ctx.message.message_id } });
  }
});

bot.on('message', async (ctx: Context) => {
  if (ctx.chat && ctx.message) {
    const userId = ctx.chat.id;
    if (ctx.chat?.type === "private") {
      if ("media_group_id" in ctx.message && ctx.message.media_group_id) {
        const groupId = ctx.message.media_group_id;
        let contentType = "";
        let fileId = "";
        let caption = null;
        const msg = ctx.message as Message.PhotoMessage | Message.VideoMessage | Message.DocumentMessage | Message.AudioMessage;
        if ("photo" in msg && msg.photo) {
          contentType = "photo";
          fileId = msg.photo.at(-1)?.file_id!;
          caption = msg.caption || null;
        }
        else if ("video" in msg && msg.video) {
          contentType = "video";
          fileId = msg.video.file_id;
          caption = msg.caption || null;
        }
        else if ("document" in msg && msg.document) {
          contentType = "document";
          fileId = msg.document.file_id;
          caption = msg.caption || null;

        }
        else if ("audio" in msg && msg.audio) {
          contentType = "audio";
          fileId = msg.audio.file_id;
          caption = msg.caption || null;
        }
        if (contentType && fileId) {
          await addMediaGroup(groupId, [
            {media: fileId, type: contentType, caption: caption}
          ]);
        };
      }
      try {
        await sendMessageTo(ctx.telegram, ctx.message, Number(config.ADMIN_CHAT));
        await addUserMsg(ctx.message.message_id, userId);
        await ctx.reply("Сообщение отправлено.");
      } catch (err) {
        console.error(err);
        await ctx.reply("Не удалось отправить сообщение.");
      };
      return;
    };
    if (
      ctx.chat.id === Number(config.ADMIN_CHAT) &&
      "reply_to_message" in ctx.message &&
      ctx.message.reply_to_message !== undefined
    ) {
      const repliedMsg = ctx.message.reply_to_message;
      const targetUserId = await getUserByMsg(repliedMsg.message_id);
      if (!targetUserId) {
        return; // No such requested user
      };
      try {
        await sendMessageTo(ctx.telegram, ctx.message, targetUserId); // <-----
        await ctx.reply("Сообщение отправлено.", { reply_parameters: { message_id: ctx.message.message_id } });
      } catch (err) {
        console.error(err);
        await ctx.reply("Не удалось отправить сообщение.", { reply_parameters: { message_id: ctx.message.message_id } });
      };
      return;
    };
  };
});

const sendMessageTo = async (
  telegram: Telegram,
  source: Message.CommonMessage | Message | undefined,
  targetId: number
) => {
  if (!source) return;
  // Несколько вложений
  if ('media_group_id' in source && source.media_group_id) {
    const groupId = source.media_group_id;
    const mediaItems = await getMediaGroup(groupId);
    if (!mediaItems.length) {
      console.error(`[ERROR] media_group ${groupId} not found in DB`);
      return;
    };
    await telegram.sendMediaGroup(targetId, mediaItems);
    return;
  };
  // Одно вложение
  if ('text' in source && source.text) {
    await telegram.sendMessage(targetId, source.text);
  } else if ('photo' in source) {
    const photo = source.photo.pop();
    if (photo)
      await telegram.sendPhoto(targetId, photo.file_id, { caption: source.caption || '' });
  } else if ('document' in source) {
    await telegram.sendDocument(targetId, source.document.file_id, { caption: source.caption || '' });
  } else if ('video' in source) {
    await telegram.sendVideo(targetId, source.video.file_id, { caption: source.caption || '' });
  } else if ('audio' in source) {
    await telegram.sendAudio(targetId, source.audio.file_id, { caption: source.caption || '' });
  } else if ('voice' in source) {
    await telegram.sendVoice(targetId, source.voice.file_id, { caption: source.caption || '' });
  } else if ('sticker' in source) {
    await telegram.sendSticker(targetId, source.sticker.file_id);
  } else if ('video_note' in source) {
    await telegram.sendVideoNote(targetId, source.video_note.file_id);
  } else {
    console.warn("Unhandled message type");
  }
};
