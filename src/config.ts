import { readFile } from "node:fs/promises"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

export interface ZbxConfig {
  api: {
    baseUrl: string
  }
  oss: {
    region: string
    bucket: string
    domain?: string
  }
  build: {
    command: string
    outputDir: string
  }
}

const CONFIG_FILENAME = "deploy.json"

export function readProjectName(cwd: string): string | undefined {
  const pkgPath = join(cwd, "package.json")
  if (!existsSync(pkgPath)) return undefined

  try {
    const content = readFileSync(pkgPath, "utf-8")
    const pkg = JSON.parse(content)
    return typeof pkg.name === "string" ? pkg.name : undefined
  } catch {
    return undefined
  }
}

function loadEnvFile(cwd: string): void {
  const envPath = join(cwd, ".env")
  if (!existsSync(envPath)) return

  try {
    const content = readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      let value = trimmed.slice(eqIndex + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (key && !(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {}
}

export async function loadConfig(cwd: string): Promise<ZbxConfig> {
  loadEnvFile(cwd)
  const configPath = join(cwd, CONFIG_FILENAME)

  let fileConfig: Partial<ZbxConfig> = {}
  try {
    const raw = await readFile(configPath, "utf-8")
    fileConfig = JSON.parse(raw) as Partial<ZbxConfig>
  } catch {
    throw new Error(
      `Config file ${CONFIG_FILENAME} not found.\n` +
        `Create it in the project root directory, example:\n\n` +
        JSON.stringify(
          {
            api: {
              baseUrl: "https://v2-api.zbanx.com",
            },
            oss: {
              region: "oss-cn-hangzhou",
              bucket: "my-bucket",
              domain: "example.com",
            },
            build: {
              command: "bun run build",
              outputDir: "dist",
            },
          },
          null,
          2,
        )
    )
  }

  const config: ZbxConfig = {
    api: {
      baseUrl: fileConfig.api?.baseUrl ?? "https://v2-api.zbanx.com",
    },
    oss: {
      region:
        process.env.ALIBABA_CLOUD_OSS_REGION ??
        fileConfig.oss?.region ??
        "",
      bucket:
        process.env.ALIBABA_CLOUD_OSS_BUCKET ??
        fileConfig.oss?.bucket ??
        "",
      domain: fileConfig.oss?.domain,
    },
    build: {
      command: fileConfig.build?.command ?? "bun run build",
      outputDir: fileConfig.build?.outputDir ?? "dist",
    },
  }

  const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID
  const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET

  if (!accessKeyId || !accessKeySecret) {
    throw new Error(
      "Missing OSS credentials. Set in .env or environment variables:\n" +
        "  ALIBABA_CLOUD_ACCESS_KEY_ID\n" +
        "  ALIBABA_CLOUD_ACCESS_KEY_SECRET",
    )
  }

  if (!config.oss.region) {
    throw new Error("Missing OSS region. Set in deploy.json or env var ALIBABA_CLOUD_OSS_REGION.")
  }
  if (!config.oss.bucket) {
    throw new Error("Missing OSS bucket. Set in deploy.json or env var ALIBABA_CLOUD_OSS_BUCKET.")
  }

  return config
}

export function getCredentials() {
  return {
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID!,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET!,
  }
}
