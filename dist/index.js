#!/usr/bin/env node

// src/index.ts
import { checkbox } from "@inquirer/prompts";
import chalk from "chalk";
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
var cherryPick = async (hashes) => {
  await git.raw(["cherry-pick", ...hashes]);
  console.log(chalk.green("\u2705 Cherry-pick successful!"));
  console.log(chalk.blue("Cherry-picked commits:\n"));
  for (const hash of hashes) {
    const subject = (await git.show(["--format=%s", "-s", hash])).trim();
    console.log(`- ${chalk.dim(`(${hash.slice(0, 7)})`)} ${subject}`);
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
      value: commit.hash
    }))
  });
  if (!selected.length) {
    console.log(chalk.yellow("\u{1F6AB} No commits selected. Exiting."));
    return;
  }
  await cherryPick(selected);
};
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`\u274C Error: ${message}`));
  process.exit(1);
});
export {
  commitsFromBranch
};
