import { stdin, stdout } from "node:process"
import { homedir } from "node:os"
import { join } from "node:path"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import type { ZbxConfig } from "./config.ts"

process.on("SIGINT", () => {
  if (stdin.setRawMode) stdin.setRawMode(false)
  stdin.pause()
  stdout.write("\n")
  process.exit(130)
})

const SESSION_DIR = join(homedir(), ".zbx")
const SESSION_FILE = join(SESSION_DIR, "session.json")

interface Session {
  accountId: number
}

function loadSession(): Session | undefined {
  try {
    const raw = readFileSync(SESSION_FILE, "utf-8")
    return JSON.parse(raw) as Session
  } catch {
    return undefined
  }
}

function saveSession(accountId: number): void {
  mkdirSync(SESSION_DIR, { recursive: true })
  writeFileSync(SESSION_FILE, JSON.stringify({ accountId }, null, 2))
}

function readInput(prompt: string, mask: boolean): Promise<string> {
  stdout.write(prompt)
  const buf: number[] = []
  const wasRaw = stdin.isRaw

  if (stdin.setRawMode) stdin.setRawMode(true)
  stdin.resume()

  return new Promise<string>((resolve) => {
    const handler = (data: Uint8Array) => {
      for (const char of data) {
        if (char === 0x03) {
          stdin.removeListener("data", handler)
          if (stdin.setRawMode) stdin.setRawMode(wasRaw || false)
          stdout.write("\n")
          process.exit(130)
          return
        }
        if (char === 0x0d || char === 0x0a) {
          stdin.removeListener("data", handler)
          if (stdin.setRawMode) stdin.setRawMode(wasRaw || false)
          stdout.write("\n")
          resolve(Buffer.from(buf).toString("utf-8"))
          return
        }
        if (char === 0x7f || char === 0x08) {
          if (buf.length > 0) {
            buf.pop()
            stdout.write("\b \b")
          }
          continue
        }
        buf.push(char)
        stdout.write(mask ? "*" : String.fromCharCode(char))
      }
    }

    stdin.on("data", handler)
  })
}

async function promptCredentials(): Promise<{ account: string; password: string }> {
  const baseUrl = process.env.ZBX_API_URL || "https://v2-api.zbanx.com"
  console.log()
  console.log("  +--- ZBX Login -----------------------------+")
  console.log(`  |  Server: ${baseUrl.padEnd(33)}|`)
  console.log("  +------------------------------------------+")

  const account = await readInput("  |  Account: ", false)
  const password = await readInput("  |  Password: ", true)

  console.log("  +------------------------------------------+")
  console.log()

  return { account, password }
}

export async function login(cwd: string, config: ZbxConfig): Promise<number> {
  const cached = loadSession()
  if (cached) {
    console.log(`  \x1b[32m[OK]\x1b[0m Already logged in (account ID: ${cached.accountId})`)
    console.log()
    return cached.accountId
  }

  while (true) {
    const { account, password } = await promptCredentials()

    const baseUrl = config.api.baseUrl
    const res = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    })
    const json = await res.json() as any

    if (json.code === 0) {
      const accountId = json.data.account.id as number
      const nickname = json.data.account.nickname as string
      saveSession(accountId)
      console.log(`  \x1b[32m[OK]\x1b[0m Login successful, welcome ${nickname}`)
      console.log()
      return accountId
    }

    const reason = json.code === 300001 ? "Invalid password or account not found" : json.reason || json.msg || "Unknown error"
    console.log(`  \x1b[33m[ERR]\x1b[0m ${reason}`)
    console.log(`  \x1b[33m[!]\x1b[0m Login failed. Press Ctrl+C to cancel and retry`)
    console.log()
  }
}
