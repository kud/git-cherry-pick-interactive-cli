#!/usr/bin/env node

import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import inquirer from "inquirer"
import chalk from "chalk"
import simpleGit from "simple-git"

const git = simpleGit()

const getCommitsFromBranch = async (branch) => {
  const currentBranch = (await git.revparse(["--abbrev-ref", "HEAD"])).trim()

  const logOutput = await git.raw([
    "log",
    `${currentBranch}..${branch}`,
    "--oneline",
  ])
  const logLines = logOutput.trim().split("\n")

  return logLines.reverse().map((line) => {
    const [hash, ...messageParts] = line.split(" ")
    const message = messageParts.join(" ")
    return {
      name: `${chalk.dim(`(${hash.slice(0, 7)})`)} ${message}`,
      value: hash,
    }
  })
}

const selectCommits = (commits) =>
  inquirer
    .prompt([
      {
        type: "checkbox",
        name: "selectedCommits",
        message: "Select commits to cherry-pick:",
        choices: commits,
      },
    ])
    .then((response) => response.selectedCommits)

const cherryPickCommits = async (commits) => {
  await git.raw(["cherry-pick", ...commits])
  console.log(chalk.green(`✅ Cherry-pick successful!`))

  console.log(chalk.blue("Cherry-picked commits:"))
  const commitDetails = await Promise.all(
    commits.map(async (hash) => {
      const commitMessage = (await git.show(["--format=%s", "-s", hash])).trim() // Fetching only the subject and trimming any whitespace
      return { hash, message: commitMessage }
    }),
  )

  console.log("")
  commitDetails.forEach(({ hash, message }) => {
    console.log(`- ${chalk.dim(`(${hash.slice(0, 7)})`)} ${message}`)
  })
}

const handleArguments = () =>
  yargs(hideBin(process.argv))
    .command("$0 <branch>", "Interactive git cherry-pick", (yargs) => {
      yargs.positional("branch", {
        describe: "Branch to list commits from",
        type: "string",
        demandOption: true,
        demandCommand: true,
      })
    })
    .fail((msg, err, yargs) => {
      if (err) throw err
      console.error(
        msg.includes("Not enough non-option arguments")
          ? chalk.red("🚫 Oops! You forgot to specify the branch name.")
          : chalk.red("🚫 Error!"),
      )
      console.error(
        msg.includes("Not enough non-option arguments")
          ? chalk.yellow("Usage: git cherry-pick-interactive <branch-name>")
          : chalk.yellow(msg),
      )
      console.error(yargs.help())
      process.exit(1)
    })
    .help().argv

async function main() {
  try {
    const argv = await handleArguments()
    const commits = await getCommitsFromBranch(argv.branch)
    const selectedCommits = await selectCommits(commits)

    if (!selectedCommits.length) {
      console.log(chalk.yellow("🚫 No commits selected. Exiting."))
      return
    }

    await cherryPickCommits(selectedCommits)
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`))
    process.exit(1)
  }
}

main()
