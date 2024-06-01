const parser = require('@tandil/diffparse');
import { readFileSync } from "fs"
import parseDiff, { File } from "parse-diff"
// import OpenAI from "openai"
import * as core from "@actions/core"

import { gitDiff, PRDetails } from "./services/github";
import { minimatch } from "minimatch";
import { validateCodeViaAI } from "./services/ai";


const excludedFiles = core.getInput("expluded_files").split(",").map((s: string) => s.trim());


export interface Details {
    title: string;
    description: string;
}

async function validateCode(diff: File[], details: Details) {
    const neededComments = [];

    for (const file of diff) {
        console.log('file', file);
        for (const chunk of file.chunks) {
            validateCodeViaAI(file, chunk, details)
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

    const diff = parseDiff(dif);
    const filteredDiff = diff.filter((file) => {
        return !excludedFiles.some((pattern) =>
          minimatch(file.to ?? "", pattern)
        );
    });

    validateCode(filteredDiff, {
        title,
        description
    })

    // Validate Some Code Yo!

    // Post some comments
}

main();