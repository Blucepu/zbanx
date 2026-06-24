import { mkdir, readFile, writeFile, readdir, unlink } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { extract as tarExtract } from "tar"

const TEMPLATE_REPO = "Blucepu/snapstatic"
const TEMPLATE_BRANCH = "main"

function projectBasename(p: string): string {
  const normalized = p.replace(/\\/g, "/")
  const parts = normalized.split("/").filter(Boolean)
  return parts[parts.length - 1] || "project"
}

function validateProjectName(name: string): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Error(
      `Invalid project name "${name}". Use lowercase letters, numbers, and hyphens only (e.g., "my-site").`,
    )
  }
}

async function countFiles(dir: string): Promise<number> {
  let count = 0
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += await countFiles(join(dir, entry.name))
    } else {
      count++
    }
  }
  return count
}

export async function initProject(
  name: string,
  options: { overwrite?: boolean },
): Promise<void> {
  const cwd = process.cwd()
  const isCurrentDir = name === "."
  const projectName = isCurrentDir ? projectBasename(cwd) : name
  const targetDir = isCurrentDir ? cwd : join(cwd, name)

  if (!isCurrentDir) {
    validateProjectName(name)
  }

  if (existsSync(targetDir)) {
    const entries = await readdir(targetDir)
    if (entries.length > 0 && !options.overwrite) {
      const displayName = isCurrentDir ? "current directory" : `"${name}"`
      console.log(`\n  \x1b[33m[!]\x1b[0m ${displayName} already exists and is not empty.`)
      console.log(`  \x1b[33m[!]\x1b[0m Use --overwrite to overwrite existing files.`)
      process.exit(1)
    }
  }

  const finalName = projectName || "project"
  if (!finalName) {
    throw new Error("Could not determine project name.")
  }

  console.log(`\n  \x1b[36m>\x1b[0m Creating project "${finalName}" in ${targetDir}`)
  console.log()

  // Download template from GitHub
  const url = `https://github.com/${TEMPLATE_REPO}/archive/refs/heads/${TEMPLATE_BRANCH}.tar.gz`
  console.log(`  \x1b[36m>\x1b[0m Downloading template from ${TEMPLATE_REPO}...`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download template: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  // Ensure target directory exists
  await mkdir(targetDir, { recursive: true })

  // Extract template/ subdirectory, stripping repo-root/ and template/
  await pipeline(
    Readable.from(buffer),
    tarExtract({
      strip: 2,
      C: targetDir,
      filter: (path: string) => path.includes("/template/"),
    }),
  )

  // Remove hero.png (binary, intentionally not scaffolded)
  const heroPng = join(targetDir, "src", "assets", "hero.png")
  if (existsSync(heroPng)) {
    await unlink(heroPng)
  }

  const fileCount = await countFiles(targetDir)

  console.log(`  \x1b[32m[OK]\x1b[0m Template files created (${fileCount} files)`)
  console.log()

  // Substitute project name
  const pkgPath = join(targetDir, "package.json")
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"))
  pkg.name = finalName
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8")

  const htmlPath = join(targetDir, "index.html")
  let html = await readFile(htmlPath, "utf-8")
  html = html.replace("<title>template</title>", `<title>${finalName}</title>`)
  await writeFile(htmlPath, html, "utf-8")

  // Install dependencies
  console.log(`  \x1b[36m>\x1b[0m Installing dependencies...`)
  console.log()

  const installProc = Bun.spawn(["bun", "install"], {
    cwd: targetDir,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  })

  const installExit = await installProc.exited
  if (installExit !== 0) {
    throw new Error(`bun install failed, exit code: ${installExit}`)
  }

  console.log(`  \x1b[32m[OK]\x1b[0m Dependencies installed`)
  console.log()

  // Verify build
  console.log(`  \x1b[36m>\x1b[0m Verifying build...`)
  console.log()

  const buildProc = Bun.spawn(["bun", "run", "build"], {
    cwd: targetDir,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  })

  const buildExit = await buildProc.exited
  if (buildExit !== 0) {
    throw new Error(`Build verification failed, exit code: ${buildExit}`)
  }

  console.log(`  \x1b[32m[OK]\x1b[0m Build verification passed`)
  console.log()
  console.log(`  \x1b[32m[SUCCESS]\x1b[0m Project "${finalName}" created!`)
  console.log()
  console.log(`  Next steps:`)
  console.log(`    cd ${isCurrentDir ? "." : finalName}`)
  console.log(`    bun dev`)
  console.log()
}
