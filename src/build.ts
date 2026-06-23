import { join } from "node:path"
import { existsSync } from "node:fs"

export async function runBuild(cwd: string, command: string, outputDir: string): Promise<string> {
  const outPath = join(cwd, outputDir)

  console.log(`\x1b[36m>\x1b[0m Running build: ${command}`)

  const parts = command.split(" ")
  const proc = Bun.spawn(parts, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  })

  const exitCode = await proc.exited

  if (exitCode !== 0) {
    throw new Error(`Build failed, exit code: ${exitCode}`)
  }

  if (!existsSync(outPath)) {
    throw new Error(`Build complete but output directory not found: ${outputDir}`)
  }

  const indexHtml = join(outPath, "index.html")
  if (!existsSync(indexHtml)) {
    throw new Error(`index.html not found in output directory: ${outputDir}`)
  }

  console.log(`\x1b[32m[OK]\x1b[0m Build complete \u2192 ${outputDir}/`)

  return outPath
}
