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
      input: message,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [config.vector_store_id],
        },
      ],
    };

    if (attachedFileId) {
      createParams["input"] = [
        {
          role: "user",
          content: [
            { type: "text", text: message },
            {
              type: "file",
              file: { file_id: attachedFileId },
            },
          ],
        },
      ];
    }

    if (previousResponseId) {
      createParams["previous_response_id"] = previousResponseId;
    }

    const response = await (openai.responses.create as (p: Record<string, unknown>) => Promise<{
      id: string;
      output_text: string;
      output: Array<{
        content?: Array<{
          annotations?: Array<{ type?: string; filename?: string }>;
        }>;
      }>;
    }>)(createParams);

    const responseId = response.id;
    const outputText = response.output_text ?? "";

    const citationSet = new Set<string>();
    if (response.output && Array.isArray(response.output)) {
      for (const outputItem of response.output) {
        if (outputItem.content && Array.isArray(outputItem.content)) {
          for (const contentItem of outputItem.content) {
            if (contentItem.annotations && Array.isArray(contentItem.annotations)) {
              for (const ann of contentItem.annotations) {
                if (ann.type === "file_citation" && ann.filename) {
                  citationSet.add(ann.filename);
                }
              }
            }
          }
        }
      }
    }

    const citations = Array.from(citationSet).map((filename) => ({ filename }));

    res.write(`data: ${JSON.stringify({ content: outputText })}\n\n`);
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
