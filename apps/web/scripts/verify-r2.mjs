import fs from "node:fs";
import path from "node:path";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const fullPath = path.join(process.cwd(), file);

  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const content = fs.readFileSync(fullPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);

    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  }
}

const requiredKeys = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
];

const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  console.error(`Missing R2 env vars: ${missingKeys.join(", ")}`);
  process.exit(1);
}

const client = new S3Client({
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
});

const key = `quizzy/healthcheck-${Date.now()}.txt`;

try {
  await client.send(
    new PutObjectCommand({
      Body: `quizzy r2 healthcheck ${new Date().toISOString()}\n`,
      Bucket: process.env.R2_BUCKET_NAME,
      ContentType: "text/plain; charset=utf-8",
      Key: key,
    }),
  );

  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }),
  );

  console.log("R2 put/delete healthcheck: ok");
} catch (error) {
  console.error("R2 put/delete healthcheck failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
