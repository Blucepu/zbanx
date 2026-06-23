#!/usr/bin/env bun

import { Command } from "commander"
import { deploy } from "./commands/deploy.ts"

const program = new Command()

program
  .name("zbx")
  .description("ZBX CLI - 静态站点部署工具")
  .version("0.1.0")

program
  .command("deploy")
  .description("构建并部署静态站点到阿里云 OSS")
  .option("--no-build", "跳过构建步骤，仅上传")
  .action(async (options: { build: boolean }) => {
    try {
      const cwd = process.cwd()
      await deploy(cwd, { skipBuild: !options.build })
    } catch (err) {
      console.error(`\n\x1b[31m✖\x1b[0m ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

program.parse()
