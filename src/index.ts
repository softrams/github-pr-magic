import { readFileSync } from "fs"
import parseDiff, { File } from "parse-diff"
import * as core from "@actions/core"

import { commentOnPullRequest, compareCommits, createReviewComment, getPullRequestDiff, PRDetails, updateBody } from "./services/github";
import { minimatch } from "minimatch";
import { obtainFeedback, prSummaryCreation, summaryAllMessages, summaryOfAllFeedback, validateCodeViaAI } from "./services/ai";


const excludedFiles = core.getInput("excluded_files").split(",").map((s: string) => s.trim());
const createPullRequestSummary = core.getInput("generate_summary");
const reviewCode = core.getInput("review_code")
const overallReview = core.getInput("overall_code_review");


export interface Details {
    title: string;
    description: string;
}

async function validatePullRequest(diff: File[], details: Details) {
    const foundSummary = [];
    for (const file of diff) {
        for (const chunk of file.chunks) {
            const message = await prSummaryCreation(file, chunk, details);
            if (message) {
                const mappedResults = message.flatMap((result: any) => {
                    if (!result.changes) {
                        return [];
                    }

                    if (!result.typeChanges) { 
                        return [];
                    }

                    if (!result.checklist) {
                        return [];
                    }


                    return {
                        changes: result.changes,
                        typeChanges: result.typeChanges,
                        checklist: result.checklist,
                    };
                });

                foundSummary.push(...mappedResults);
            }
        }
    }


    if (foundSummary && foundSummary.length > 0) {
        const compiledSummary = await summaryAllMessages(foundSummary);
        return compiledSummary;
    }

    return '';
}

async function validateCode(diff: File[], details: Details) {
    const neededComments = [];
    for (const file of diff) {
        for (const chunk of file.chunks) {
            const results = await validateCodeViaAI(file, chunk, details);

            if (results) {
                const mappedResults = results.flatMap((result: any) => {
                    if (!file.to) {
                        return [];
                    }

                    if (!result.lineNumber) {
                        return [];
                    }

                    if (!result.review) { 
                        return [];
                    }

                    return {
                        body: result.review,
                        path: file.to,
                        line: parseInt(result.lineNumber, 10)
                    };
                });

                if (mappedResults) {
                    neededComments.push(...mappedResults);
                }
            }
        }
    }

    return neededComments;
}

async function validateOverallCodeReview(diff: File[], details: Details) {
    const detailedFeedback = [];
    for (const file of diff) {
        for (const chunk of file.chunks) {
            const results = await obtainFeedback(file, chunk, details);
            if (results) {
                const mappedResults = results.flatMap((result: any) => {
                    if (!file.to) {
                        return [];
                    }

                    return {
                        changesOverview: result.changesOverview,
                        feedback: result.feedback,
                        improvements: result.improvements,
                        conclusion: result.conclusion,
                    };
                });

                if (mappedResults) {
                    detailedFeedback.push(...mappedResults);
                }
            }
        }
    }

    return detailedFeedback;
}


async function main() {
    let dif: string | null = null;
    const { action, repository, number, before, after } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH || "", "utf-8"))
    const { title, description } = await PRDetails(repository, number);
    if (action === "opened" || action === "reopened") {
        const data = await getPullRequestDiff(repository.owner.login, repository.name, number);
        dif = data as unknown as string;
    } else if (action === "synchronize") {
        const newBaseSha = before;
        const newHeadSha = after;
    
        const data = await compareCommits({
            owner: repository.owner.login,
            repo: repository.name,
            before: newBaseSha,
            after: newHeadSha,
            number
        })
    
        dif = String(data);
    } else {
        console.log('Unknown action', process.env.GITHUB_EVENT_NAME);
        return;
    }

    if (!dif) {
        console.log('No diff found, exiting')
        return;
    }

    const diff = parseDiff(dif);
    const filteredDiff = diff.filter((file) => {
        return !excludedFiles.some((pattern) =>
          minimatch(file.to ?? "", pattern)
        );
    });

    if (action === "opened" || action === "reopened") {
        if (createPullRequestSummary) {
            console.log('Generating summary for new PR');
            const summary = await validatePullRequest(diff, {
                title,
                description
            });

            if (summary) {
                await updateBody(repository.owner.login, repository.name, number, summary);
            }
        }

        if (overallReview) {
            const detailedFeedback = await validateOverallCodeReview(filteredDiff, {
                title,
                description
            });
        
            if (detailedFeedback && detailedFeedback.length > 0) {
                const resultsFullFeedback = await summaryOfAllFeedback(detailedFeedback);
                if (resultsFullFeedback) {
                    await commentOnPullRequest({
                        owner: repository.owner.login,
                        repo: repository.name,
                        number
                    }, resultsFullFeedback);
                }
            }
        }
    }

    if (reviewCode) {
        const neededComments = await validateCode(filteredDiff, {
            title,
            description
        });

        if (neededComments) {
            await createReviewComment(repository.owner.login, repository.name, number, neededComments);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
