import { Context, Markup, Telegraf, Telegram } from 'telegraf';

import config from "./config";
import { getUserByMsg, addUserMsg, addMediaGroupItem, getMediaGroup, editMediaGroupItem } from "./db_client"; 
import { Message } from '@telegraf/types/message';
import { media_group } from '@dietime/telegraf-media-group';
import { InlineKeyboardMarkup, InputMediaDocument, InputMediaPhoto, InputMediaVideo } from 'telegraf/typings/core/types/typegram';

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
}

const sendMediaGroupTo = async (
  telegram: Telegram, 
  source: Message.CommonMessage | Message | undefined, 
  targetId: number,
  kb?: InlineKeyboardMarkup
) => {
  if (source) {
    if ("media_group_id" in source && source.media_group_id) {
      const mediaGroup = await getMediaGroup(source.media_group_id); // Не может найти медиагруппу
      if (mediaGroup) {
        const media = mediaGroup
          .map((item): InputMediaPhoto | InputMediaVideo | InputMediaDocument | undefined => {
            switch (item.type) {
              case "photo":
              case "video":
              case "document":
                return {
                  type: item.type,
                  media: item.file_id,
                  caption: item.caption ?? "",
                };
              default:
                return undefined;
            }
          })
          .filter(
            (item): item is InputMediaPhoto | InputMediaVideo | InputMediaDocument =>
              item !== undefined
          );
        await telegram.sendMediaGroup(
          targetId,
          media as unknown as readonly InputMediaDocument[],
        );
        if (kb) { 
          await bot.telegram.sendMessage(
            targetId, "\u3164", { reply_markup: await feedBackKb() }
          )
        };
      }
      return;
    }
  }
}

const sendMessageTo = async (
  telegram: Telegram, 
  source: Message.CommonMessage | Message | undefined, 
  targetId: number,
  kb?: InlineKeyboardMarkup
) => {
  if (source) {
    const extra = kb ? { reply_markup: kb } : undefined;
    if ('text' in source && source.text) {
      await telegram.sendMessage(targetId, source.text, extra);
    } else if ("photo" in source) {
      const photo = source.photo.pop();
      if (photo)
        await telegram.sendPhoto(targetId, photo.file_id, { caption: source.caption || '', ...extra });
    } else if ("document" in source) {
      await telegram.sendDocument(targetId, source.document.file_id, { caption: source.caption || '', ...extra });
    } else if ("video" in source) {
      await telegram.sendVideo(targetId, source.video.file_id, { caption: source.caption || '', ...extra });
    } else if ("audio" in source) {
      await telegram.sendAudio(targetId, source.audio.file_id, { caption: source.caption || '', ...extra });
    } else if ("voice" in source) {
      await telegram.sendVoice(targetId, source.voice.file_id, { caption: source.caption || '', ...extra });
    } else if ("sticker" in source) {
      await telegram.sendSticker(targetId, source.sticker.file_id, extra);
    } else if ("video_note" in source) {
      await telegram.sendVideoNote(targetId, source.video_note.file_id, extra)
    } else {
      return; // Unhandled message type
    };
  };
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

bot.command('post', async (ctx: Context) => {
  const targetId = Number(config.ADMIN_CHANNEL);
  if (ctx.chat && ctx.message) {
    if (ctx.chat.id === Number(config.ADMIN_CHAT)) { // Команда доступна только администрации
      if (targetId) { // Канал администрации указан?
        if (
          "reply_to_message" in ctx.message &&
           ctx.message.reply_to_message !== undefined
        ) {
          try {
            ("media_group_id" in ctx.message.reply_to_message) ?
              await sendMediaGroupTo(bot.telegram, ctx.message.reply_to_message, targetId, await feedBackKb()) :
              await sendMessageTo(bot.telegram, ctx.message.reply_to_message, targetId, await feedBackKb());
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

const parseMediaGroup = (source: Message.CommonMessage | Message | undefined) => {
  if (!source) return;
  let type = "";
  let file_id = "";
  if ("photo" in source) {
    type = "photo";
    file_id = source.photo.at(-1)?.file_id || "";
  } else if ("video" in source) {
    type = "video";
    file_id = source.video.file_id;
  } else if ("document" in source) {
    type = "document";
    file_id = source.document.file_id;
  } else {
    console.log("Unhandled media type");
  };
  return { type: type, file_id: file_id };
}

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
      try {
        const forward = await ctx.forwardMessage(config.ADMIN_CHAT);
        await addUserMsg(forward.message_id, userId);
        await ctx.reply("Сообщение отправлено.");
      } catch (err) {
        console.error(err);
        await ctx.reply("Не удалось отправить сообщение.");
      };
      return;
    } else if (ctx.chat.id === Number(config.ADMIN_CHAT)) {
      if ("media_group_id" in ctx.message && ctx.message.media_group_id) {
        const media = parseMediaGroup(ctx.message);
        if (!media) return;
        const { type, file_id } = media;
        await addMediaGroupItem(
          ctx.message.media_group_id,
          ctx.message.message_id,
          ctx.message.chat.id,
          type,
          file_id,
          ctx.message.caption
        );
      };
      if (
        "reply_to_message" in ctx.message &&
        ctx.message.reply_to_message !== undefined
      ) {
        const repliedMsg = ctx.message.reply_to_message;
        const targetUserId = await getUserByMsg(repliedMsg.message_id);
        if (!targetUserId) return;  // No such requested user
        try {
          await sendMessageTo(bot.telegram, ctx.message, targetUserId);
          await ctx.reply("Сообщение отправлено.", { reply_parameters: { message_id: ctx.message.message_id } });
        } catch (err) {
          console.error(err);
          await ctx.reply("Не удалось отправить сообщение.", { reply_parameters: { message_id: ctx.message.message_id } });
        };
      }
    }
  };
});

bot.on("edited_message", async (ctx: Context) => {
  const source = ctx.editedMessage as Message.CommonMessage;
  if (
    "media_group_id" in source && 
    typeof source.media_group_id === "string" && 
    source.media_group_id
  ) {
    const media = parseMediaGroup(source);
    if (!media) return;
    const { file_id } = media;
    await editMediaGroupItem(
      source.media_group_id,              
      source.message_id,                  
      file_id,                          
      'caption' in source && typeof source.caption === 'string' ? source.caption : ""
    );
  }
});
