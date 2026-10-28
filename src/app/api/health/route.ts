import { NextResponse } from "next/server";
import { getJobRepository } from "@/server/db/repository";

export async function GET() {
  const startTime = Date.now();
  const repo = getJobRepository();
  const memory = process.memoryUsage();

  const healthData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    responseTimeMs: Date.now() - startTime,
    memory: {
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
    },
    services: {
      repository: {
        status: "up",
        type: repo.constructor.name,
      },
      greenhouse: {
        status: "live",
        mode: "public_boards",
      },
      lever: {
        status: "live",
        mode: "public_postings",
      },
      ashby: {
        status: "live",
        mode: "public_boards",
      },
      jobvetta: {
        status: process.env.JOBVETTA_API_KEY ? "live" : "demo_fallback",
        apiKeyConfigured: Boolean(process.env.JOBVETTA_API_KEY),
      },
      adzuna: {
        status:
          process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY
            ? "live"
            : "demo_fallback",
        configured: Boolean(
          process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY
        ),
      },
      jooble: {
        status: process.env.JOOBLE_API_KEY ? "live" : "demo_fallback",
        configured: Boolean(process.env.JOOBLE_API_KEY),
      },
      apify: {
        status:
          process.env.APIFY_API_TOKEN && process.env.APIFY_DEFAULT_DATASET_ID
            ? "live"
            : "demo_fallback",
        configured: Boolean(
          process.env.APIFY_API_TOKEN && process.env.APIFY_DEFAULT_DATASET_ID
        ),
      },
    },
  };

  return NextResponse.json(healthData, { status: 200 });
}
