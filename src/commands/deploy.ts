import { loadConfig, readProjectName } from "../config.ts"
import { runBuild } from "../build.ts"
import { uploadToOss } from "../oss.ts"
import { login } from "../auth.ts"

export interface DeployOptions {
  skipBuild: boolean
}

export async function deploy(cwd: string, options: DeployOptions): Promise<void> {
  const config = await loadConfig(cwd)

  const accountId = await login(cwd, config)
  const projectName = readProjectName(cwd) || "unknown"

  let distDir: string

  if (!options.skipBuild) {
    distDir = await runBuild(cwd, config.build.command, config.build.outputDir)
  } else {
    const { join } = await import("node:path")
    const { existsSync } = await import("node:fs")
    distDir = join(cwd, config.build.outputDir)
    if (!existsSync(distDir)) {
      throw new Error(`输出目录不存在: ${config.build.outputDir}`)
    }
    console.log(`\x1b[36m▶\x1b[0m 跳过构建，使用现有 ${config.build.outputDir}/`)
  }

  const stats = await uploadToOss(distDir, config, accountId, projectName)

  console.log(
    `\n\x1b[32m✔\x1b[0m 部署完成！上传了 ${stats.fileCount} 个文件，共 ${formatSize(stats.totalSize)}`,
  )

  const accessUrl = config.oss.domain
    ? `https://${config.oss.domain}/web/${accountId}/${projectName}/index.html`
    : `https://${config.oss.bucket}.${config.oss.region}.aliyuncs.com/web/${accountId}/${projectName}/index.html`

  console.log(`\x1b[36m▶\x1b[0m 访问地址: ${accessUrl}`)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
