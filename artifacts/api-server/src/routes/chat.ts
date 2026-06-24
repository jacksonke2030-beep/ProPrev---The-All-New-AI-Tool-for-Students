import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const workspaceRoot = process.cwd().endsWith(
  path.join("artifacts", "api-server"),
)
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const configPath = path.resolve(
  workspaceRoot,
  "artifacts/api-server/config.json",
);

interface AppConfig {
  assistant_name: string;
  assistant_instructions: string;
  model: string;
  vector_store_id: string;
}

function loadConfig(): AppConfig {
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as AppConfig;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const STARTER_QUESTIONS = [
  "Help me plan my week's assignments",
  "I have 3 assignments due Friday — where do I start?",
  "How do I break a big project into steps?",
  "Make me a study checklist for tomorrow",
];

router.get("/chat/config", (_req, res) => {
  try {
    const config = loadConfig();
    res.json({
      assistantName: config.assistant_name,
      welcomeMessage: "Need help organizing?",
      model: config.model,
      starterQuestions: STARTER_QUESTIONS,
    });
  } catch (err) {
    logger.error({ err }, "Failed to load config");
    res.status(500).json({ error: "Failed to load config" });
  }
});

router.post("/chat/message", async (req, res) => {
  const { message, previousResponseId, attachedFileId } = req.body as {
    message: string;
    previousResponseId?: string | null;
    attachedFileId?: string | null;
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const config = loadConfig();

    const createParams: Record<string, unknown> = {
      model: config.model,
      instructions: config.assistant_instructions,
      input: attachedFileId
        ? [
            {
              role: "user",
              content: [
                { type: "text", text: message },
                { type: "file", file: { file_id: attachedFileId } },
              ],
            },
          ]
        : message,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [config.vector_store_id],
        },
      ],
      stream: true,
    };

    if (previousResponseId) {
      createParams["previous_response_id"] = previousResponseId;
    }

    type StreamEvent = {
      type: string;
      delta?: string;
      response?: {
        id: string;
        output?: Array<{
          content?: Array<{
            annotations?: Array<{ type?: string; filename?: string }>;
          }>;
        }>;
      };
    };

    const stream = (await (
      openai.responses.create as (p: Record<string, unknown>) => Promise<AsyncIterable<StreamEvent>>
    )(createParams));

    let responseId: string | null = null;
    const citationSet = new Set<string>();

    for await (const event of stream) {
      if (event.type === "response.created" && event.response?.id) {
        responseId = event.response.id;
      }

      if (event.type === "response.output_text.delta" && event.delta) {
        res.write(`data: ${JSON.stringify({ content: event.delta })}\n\n`);
      }

      if (event.type === "response.completed" && event.response) {
        if (event.response.id) responseId = event.response.id;

        const output = event.response.output;
        if (Array.isArray(output)) {
          for (const item of output) {
            const content = item.content;
            if (Array.isArray(content)) {
              for (const c of content) {
                const annotations = c.annotations;
                if (Array.isArray(annotations)) {
                  for (const ann of annotations) {
                    if (ann.type === "file_citation" && ann.filename) {
                      citationSet.add(ann.filename);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    const citations = Array.from(citationSet).map((filename) => ({ filename }));
    res.write(`data: ${JSON.stringify({ done: true, responseId, citations })}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ err }, "Chat message error");
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

router.post("/chat/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  try {
    const { originalname, buffer, mimetype } = req.file;

    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: mimetype });
    const fileObj = new File([blob], originalname, { type: mimetype });

    const file = await openai.files.create({
      file: fileObj,
      purpose: "assistants",
    });

    res.json({
      fileId: file.id,
      filename: originalname,
    });
  } catch (err) {
    logger.error({ err }, "File upload error");
    res.status(500).json({ error: "Failed to upload file" });
  }
});

export default router;
