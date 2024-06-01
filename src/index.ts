const parser = require('@tandil/diffparse');
import { readFileSync } from "fs"
import parseDiff from "parse-diff"
// import OpenAI from "openai"
import * as core from "@actions/core"

import { gitDiff, PRDetails } from "./services/github";
import { minimatch } from "minimatch";

// const openai = new OpenAI()
const excludedFiles = core.getInput("expluded_files").split(",").map((s: string) => s.trim());


async function validateCode(diff: any[]) {
    const neededComments = [];

    for (const file of diff) {
        console.log('file', file);
        for (const chunk of file.chunks) {
            const message = "Remove console.log statements";
        }
        // const comments = [];
        // for (const chunk of file.chunks) {
        //     const lines = chunk.changes.map((change: Change) => change.content);
        //     const code = lines.join("\n");
        //     if (code.includes("console.log")) {
        //         comments.push({
        //             line: chunk.content[0].lineNumber,
        //             message: "Remove console.log statements",
        //         });
        //     }
        // }
        // if (comments.length > 0) {
        //     neededComments.push({
        //         file: file.to,
        //         comments,
        //     });
        // }
    }
}


async function main() {
    let dif: string | null = null;
    const { action, repository, number } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH || "", "utf-8"))
    const { title, description } = await PRDetails(repository, number);
    console.log(`PR Title: ${title}`);
    console.log(`PR Description: ${description}`);
    console.log(`PR Action: ${action}`);
    console.log(`PR Number: ${number}`);
    const data = await gitDiff(repository.owner.login, repository.name, number);
        dif = data as unknown as string;
        // console.log('data', data)
    // if (action === "opened") {
    //     // Generate a summary of the PR since it's a new PR
    //     console.log('Generating summary for new PR');
    //     const data = await gitDiff(repository.owner.login, repository.name, number);
    //     // diff = data.body;
    //     console.log('data', data)
    //     // dif = await gitDiff(repository.owner.login, repository.name, number) as string;
    // }

    if (!dif) {
        // Well shit.
        return;
    }

    // const diff = parser.parseDiffString(dif);
    const diff = parseDiff(dif);
    const filteredDiff = diff.filter((file) => {
        return !excludedFiles.some((pattern) =>
          minimatch(file.to ?? "", pattern)
        );
    });

    console.log('filteredDiff', filteredDiff);
    validateCode(filteredDiff)

    // Validate Some Code Yo!

    // Post some comments
}

main();