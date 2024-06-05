"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const parse_diff_1 = __importDefault(require("parse-diff"));
const core = __importStar(require("@actions/core"));
const github_1 = require("./services/github");
const minimatch_1 = require("minimatch");
const ai_1 = require("./services/ai");
const excludedFiles = core.getInput("excluded_files").split(",").map((s) => s.trim());
const createPullRequestSummary = core.getInput("generate_summary");
const reviewCode = core.getInput("review_code");
const overallReview = core.getInput("overall_code_review");
async function validatePullRequest(diff, details) {
    const foundSummary = [];
    for (const file of diff) {
        for (const chunk of file.chunks) {
            const message = await (0, ai_1.prSummaryCreation)(file, chunk, details);
            if (message) {
                const mappedResults = message.flatMap((result) => {
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
        const compiledSummary = await (0, ai_1.summaryAllMessages)(foundSummary);
        return compiledSummary;
    }
    return '';
}
async function validateCode(diff, details) {
    const neededComments = [];
    for (const file of diff) {
        for (const chunk of file.chunks) {
            const results = await (0, ai_1.validateCodeViaAI)(file, chunk, details);
            if (results) {
                const mappedResults = results.flatMap((result) => {
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
async function validateOverallCodeReview(diff, details) {
    const detailedFeedback = [];
    for (const file of diff) {
        for (const chunk of file.chunks) {
            const results = await (0, ai_1.obtainFeedback)(file, chunk, details);
            if (results) {
                const mappedResults = results.flatMap((result) => {
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
    let dif = null;
    const { action, repository, number, before, after } = JSON.parse((0, fs_1.readFileSync)(process.env.GITHUB_EVENT_PATH || "", "utf-8"));
    const { title, description } = await (0, github_1.PRDetails)(repository, number);
    if (action === "opened" || action === "reopened") {
        const data = await (0, github_1.getPullRequestDiff)(repository.owner.login, repository.name, number);
        dif = data;
    }
    else if (action === "synchronize") {
        const newBaseSha = before;
        const newHeadSha = after;
        const data = await (0, github_1.compareCommits)({
            owner: repository.owner.login,
            repo: repository.name,
            before: newBaseSha,
            after: newHeadSha,
            number
        });
        dif = String(data);
    }
    else {
        console.log('Unknown action', process.env.GITHUB_EVENT_NAME);
        return;
    }
    if (!dif) {
        console.log('No diff found, exiting');
        return;
    }
    const diff = (0, parse_diff_1.default)(dif);
    const filteredDiff = diff.filter((file) => {
        return !excludedFiles.some((pattern) => { var _a; return (0, minimatch_1.minimatch)((_a = file.to) !== null && _a !== void 0 ? _a : "", pattern); });
    });
    if (action === "opened" || action === "reopened") {
        if (createPullRequestSummary) {
            console.log('Generating summary for new PR');
            const summary = await validatePullRequest(diff, {
                title,
                description
            });
            if (summary) {
                await (0, github_1.updateBody)(repository.owner.login, repository.name, number, summary);
            }
        }
        if (overallReview) {
            const detailedFeedback = await validateOverallCodeReview(filteredDiff, {
                title,
                description
            });
            if (detailedFeedback && detailedFeedback.length > 0) {
                const resultsFullFeedback = await (0, ai_1.summaryOfAllFeedback)(detailedFeedback);
                if (resultsFullFeedback) {
                    await (0, github_1.commentOnPullRequest)({
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
            await (0, github_1.createReviewComment)(repository.owner.login, repository.name, number, neededComments);
        }
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
