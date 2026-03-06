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

export async function sendTelegramMessage(input: TelegramSendMessageInput): Promise<void> {
  const retries = Math.max(0, input.retries ?? 3);
  const retryDelayMs = Math.max(100, input.retryDelayMs ?? 750);
  const endpoint = `https://api.telegram.org/bot${input.botToken}/sendMessage`;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      const response = await axios.post(
        endpoint,
        {
          chat_id: input.chatId,
          text: input.text,
          parse_mode: input.parseMode,
          disable_web_page_preview: input.disableWebPagePreview,
          disable_notification: input.disableNotification,
        },
        { timeout: 10_000 },
      );

      if (!response.data?.ok) {
        throw new TelegramSendError(response.data?.description || "Telegram API returned an error", 502);
      }

      return;
    } catch (error) {
      lastError = error;
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
