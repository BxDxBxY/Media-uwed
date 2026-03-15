import axios from "axios";

export type TelegramSendMessageInput = {
  botToken: string;
  chatId: string;
  text: string;
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  retries?: number;
  retryDelayMs?: number;
  photoUrl?: string;
};

export class TelegramSendError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TelegramSendError";
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TELEGRAM_TEXT_LIMIT = 4096;
const TELEGRAM_CAPTION_LIMIT = 1024;

function trimToLimit(value: string, limit: number) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3))}...`;
}

function getTelegramMethod(input: TelegramSendMessageInput): "sendMessage" | "sendPhoto" {
  return input.photoUrl && input.photoUrl.trim() ? "sendPhoto" : "sendMessage";
}

export async function sendTelegramMessage(input: TelegramSendMessageInput): Promise<void> {
  const retries = Math.max(0, input.retries ?? 3);
  const retryDelayMs = Math.max(100, input.retryDelayMs ?? 750);

  const botToken = String(input.botToken || "").trim();
  const chatId = String(input.chatId || "").trim();

  if (!botToken || !chatId) {
    console.error("Telegram config missing before send", {
      hasBotToken: Boolean(botToken),
      hasChatId: Boolean(chatId),
    });
    throw new TelegramSendError("Telegram bot token or chat id is missing");
  }

  const method = getTelegramMethod(input);
  const endpoint = `https://api.telegram.org/bot${botToken}/${method}`;
  const parseMode = input.parseMode;

  const safeMessage = trimToLimit(
    input.text,
    method === "sendPhoto" ? TELEGRAM_CAPTION_LIMIT : TELEGRAM_TEXT_LIMIT,
  );

  const payload =
    method === "sendPhoto"
      ? {
          chat_id: chatId,
          photo: String(input.photoUrl || "").trim(),
          caption: safeMessage,
          parse_mode: parseMode,
          disable_notification: input.disableNotification,
        }
      : {
          chat_id: chatId,
          text: safeMessage,
          parse_mode: parseMode,
          disable_web_page_preview: input.disableWebPagePreview,
          disable_notification: input.disableNotification,
        };

  console.log("Telegram send debug", {
    hasBotToken: Boolean(botToken),
    hasChatId: Boolean(chatId),
    endpoint: method,
    parse_mode: parseMode || null,
    textOrCaptionLength: safeMessage.length,
    preview: safeMessage.slice(0, 100),
  });

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      const response = await axios.post(endpoint, payload, { timeout: 10_000 });

      if (!response.data?.ok) {
        throw new TelegramSendError(response.data?.description || "Telegram API returned an error", 502);
      }

      return;
    } catch (error: any) {
      lastError = error;
      console.error("Telegram send failure", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message || String(error),
      });

      if (method === "sendPhoto") {
        try {
          const fallbackEndpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
          const fallbackPayload = {
            chat_id: chatId,
            text: trimToLimit(input.text, TELEGRAM_TEXT_LIMIT),
            parse_mode: parseMode,
            disable_web_page_preview: input.disableWebPagePreview,
            disable_notification: input.disableNotification,
          };

          const fallbackRes = await axios.post(fallbackEndpoint, fallbackPayload, { timeout: 10_000 });
          if (fallbackRes.data?.ok) return;
        } catch (fallbackError) {
          console.error("Telegram fallback sendMessage failed", fallbackError);
        }
      }

      if (attempt >= retries) break;
      await wait(retryDelayMs * (attempt + 1));
    }

    attempt += 1;
  }

  if (axios.isAxiosError(lastError)) {
    throw new TelegramSendError(
      lastError.response?.data?.description || lastError.message || "Telegram request failed",
      lastError.response?.status,
    );
  }

  if (lastError instanceof TelegramSendError) throw lastError;
  throw new TelegramSendError("Telegram send failed after retries");
}
