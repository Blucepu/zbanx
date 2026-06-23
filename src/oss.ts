import OSS from "ali-oss"
import { lookup } from "mime-types"
import { readdir, stat } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import type { ZbxConfig } from "./config.ts"
import { getCredentials } from "./config.ts"

interface UploadStats {
  fileCount: number
  totalSize: number
}

async function walkDir(dir: string, base: string = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath, base)))
    } else if (entry.isFile()) {
      files.push(relative(base, fullPath))
    }
  }

  return files
}

function getOssKey(accountId: number, projectName: string, relativePath: string): string {
  const normalized = relativePath.split(sep).join("/")
  return `web/${accountId}/${projectName}/${normalized}`
}

function getBasePath(accountId: number, projectName: string): string {
  return `web/${accountId}/${projectName}/`
}

function getCacheControl(relativePath: string): string {
  const normalized = relativePath.split(sep).join("/")
  if (normalized.startsWith("assets/")) {
    return "public, max-age=31536000, immutable"
  }
  if (normalized.endsWith(".html")) {
    return "no-cache, no-store, must-revalidate"
  }
  return "public, max-age=3600"
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export async function uploadToOss(distDir: string, config: ZbxConfig, accountId: number, projectName: string): Promise<UploadStats> {
  const credentials = getCredentials()

  const client = new OSS({
    region: config.oss.region,
    accessKeyId: credentials.accessKeyId,
    accessKeySecret: credentials.accessKeySecret,
    bucket: config.oss.bucket,
  })

  const files = await walkDir(distDir)
  const stats: UploadStats = { fileCount: 0, totalSize: 0 }
  const basePath = getBasePath(accountId, projectName)

  console.log(`\x1b[36m▶\x1b[0m 上传 ${files.length} 个文件到 OSS...`)
  console.log(`  bucket: ${config.oss.bucket}`)
  console.log(`  path: ${basePath}\n`)

  for (const relPath of files) {
    const fullPath = join(distDir, relPath)
    const ossKey = getOssKey(accountId, projectName, relPath)
    const cacheControl = getCacheControl(relPath)
    const mimeType = lookup(relPath) || "application/octet-stream"
    const fileSize = (await stat(fullPath)).size

    await client.put(ossKey, fullPath, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": cacheControl,
      },
    })

    stats.fileCount++
    stats.totalSize += fileSize
    console.log(`  \x1b[32m✓\x1b[0m ${ossKey} (${formatSize(fileSize)})`)
  }

  return stats
}
