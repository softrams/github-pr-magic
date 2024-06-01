const parser = require('@tandil/diffparse');
import { readFileSync } from "fs"
import parseDiff, { File } from "parse-diff"
// import OpenAI from "openai"
import * as core from "@actions/core"

import { createReviewComment, gitDiff, PRDetails } from "./services/github";
import { filter, minimatch } from "minimatch";
import { prSummaryCreation, validateCodeViaAI } from "./services/ai";


const excludedFiles = core.getInput("expluded_files").split(",").map((s: string) => s.trim());


export interface Details {
    title: string;
    description: string;
}

async function validateCode(diff: File[], details: Details) {
    const neededComments = [];

    for (const file of diff) {
        for (const chunk of file.chunks) {
            const message = await prSummaryCreation(file.to ?? "", details.title);
            console.log('message', message);
            // const results = await validateCodeViaAI(file, chunk, details);

            // if (results) {
            //     const mappedResults = results.flatMap((result: any) => {
            //         if (!file.to) {
            //             return [];
            //         }

            //         if (!result.lineNumber) {
            //             return [];
            //         }

            //         if (!result.review) { 
            //             return [];
            //         }

            //         return {
            //             body: result.review,
            //             path: file.to,
            //             position: Number(result.lineNumber),
            //         };
            //     });

            //     if (mappedResults) {
            //         neededComments.push(...mappedResults);
            //     }
            // }
        }
    }
    return [];
}


async function main() {
    let dif: string | null = null;
    const { action, repository, number } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH || "", "utf-8"))
    const { title, description, patch_url } = await PRDetails(repository, number);

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

    const neededComments = await validateCode(filteredDiff, {
        title,
        description
    });

    // console.log('neededComments', neededComments);
    // if (neededComments && neededComments.length > 0) {
    //     await createReviewComment(repository.owner.login, repository.name, number, neededComments);
    // }

    // Validate Some Code Yo!

    // Post some comments
}

main();