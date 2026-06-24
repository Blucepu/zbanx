#!/usr/bin/env bun

import { Command } from "commander"
import { deploy } from "./commands/deploy.ts"
import { initProject } from "./commands/init.ts"

const program = new Command()

program
  .name("zbanx")
  .description("zbanx - static site deployment tool")
  .version("1.1.2", "-v, --version")

program
  .command("deploy")
  .description("Build and deploy static site to Alibaba Cloud OSS")
  .option("--no-build", "Skip build step, upload only")
  .action(async (options: { build: boolean }) => {
    try {
      const cwd = process.cwd()
      await deploy(cwd, { skipBuild: !options.build })
    } catch (err) {
      console.error(`\n\x1b[31m✖\x1b[0m ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

program
  .command("init")
  .description("Create a new project from the snapstatic template")
  .argument("<project-name>", "Project name (lowercase + hyphens, or '.' for current dir)")
  .option("--overwrite", "Overwrite existing files if target directory exists")
  .action(async (projectName: string, options: { overwrite?: boolean }) => {
    try {
      await initProject(projectName, { overwrite: options.overwrite })
    } catch (err) {
      console.error(`\n\x1b[31m✖\x1b[0m ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

program.parse()
