#!/usr/bin/env node

// src/index.ts
import { checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
import { simpleGit } from "simple-git";
var git = simpleGit();
var commitsFromBranch = async (branch) => {
  const currentBranch = (await git.revparse(["--abbrev-ref", "HEAD"])).trim();
  const raw = await git.raw(["log", `${currentBranch}..${branch}`, "--oneline"]);
  return raw.trim().split("\n").filter(Boolean).reverse().map((line) => {
    const [hash, ...rest] = line.split(" ");
    return { hash, message: rest.join(" ") };
  });
};
var cherryPick = async (commits) => {
  await git.raw(["cherry-pick", ...commits.map((commit) => commit.hash)]);
  console.log(chalk.green("\u2705 Cherry-pick successful!"));
  console.log(chalk.blue("Cherry-picked commits:\n"));
  for (const { hash, message } of commits) {
    console.log(`- ${chalk.dim(`(${hash.slice(0, 7)})`)} ${message}`);
  }
};
var main = async () => {
  const branch = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
  if (!branch) {
    console.error(chalk.red("\u{1F6AB} Missing branch."));
    console.error(chalk.yellow("Usage: git-cherry-pick-interactive <branch>"));
    process.exit(1);
  }
  const commits = await commitsFromBranch(branch);
  if (!commits.length) {
    console.log(
      chalk.yellow(`\u{1F6AB} No commits on ${branch} that aren't already here.`)
    );
    return;
  }
  const selected = await checkbox({
    message: "Select commits to cherry-pick:",
    choices: commits.map((commit) => ({
      name: `${chalk.dim(`(${commit.hash.slice(0, 7)})`)} ${commit.message}`,
      value: commit
    }))
  });
  if (!selected.length) {
    console.log(chalk.yellow("\u{1F6AB} No commits selected. Exiting."));
    return;
  }
  await cherryPick(selected);
};
var handleFatal = (error) => {
  if (error instanceof Error && error.name === "ExitPromptError") {
    process.exit(130);
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`\u274C Error: ${message}`));
  process.exit(1);
};
var isEntryPoint = () => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};
if (isEntryPoint()) main().catch(handleFatal);
export {
  cherryPick,
  commitsFromBranch,
  handleFatal
};
