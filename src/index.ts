const parser = require('@tandil/diffparse');
import { readFileSync } from "fs"
import OpenAI from "openai"
import core from "@actions/core";
import { PRDetails } from "./lib/github";
import { minimatch } from "minimatch";

const openai = new OpenAI()
const excludedFiles = core.getInput("exclude").split(",").map((s: string) => s.trim());

async function main() {
    let dif: string | null = null;
    const { action, repository, number } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH || "", "utf-8"))
    const { title, description } = await PRDetails(repository, number);

    if (action === "opened") {
        // Generate a summary of the PR since it's a new PR
        console.log('Generating summary for new PR');
    }

    if (!dif) {
        // Well shit.
        return;
    }

    const diff = parser.parseDiffString(dif);
    const filteredDiff = diff.filter((file: { to: any; }) => {
        return !excludedFiles.some((pattern) =>
          minimatch(file.to ?? "", pattern)
        );
    });

    console.log(filteredDiff);

    // Validate Some Code Yo!

    // Post some comments
}

main();