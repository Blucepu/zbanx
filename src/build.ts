import { join } from "node:path"
import { existsSync } from "node:fs"

export async function runBuild(cwd: string, command: string, outputDir: string): Promise<string> {
  const outPath = join(cwd, outputDir)

  console.log(`\x1b[36m▶\x1b[0m 执行构建: ${command}`)

  const parts = command.split(" ")
  const proc = Bun.spawn(parts, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  })

  const exitCode = await proc.exited

  if (exitCode !== 0) {
    throw new Error(`构建失败，退出码: ${exitCode}`)
  }

  if (!existsSync(outPath)) {
    throw new Error(`构建完成但未找到输出目录: ${outputDir}`)
  }

  const indexHtml = join(outPath, "index.html")
  if (!existsSync(indexHtml)) {
    throw new Error(`输出目录中未找到 index.html: ${outputDir}`)
  }

  console.log(`\x1b[32m✔\x1b[0m 构建完成 → ${outputDir}/`)

  return outPath
}
