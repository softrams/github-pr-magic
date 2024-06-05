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
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareCommits = exports.createReviewComment = exports.getPullRequestDiff = exports.updateBody = exports.commentOnPullRequest = exports.PRDetails = void 0;
const rest_1 = require("@octokit/rest");
const core = __importStar(require("@actions/core"));
const GITHUB_TOKEN = core.getInput("github_token");
const octokit = new rest_1.Octokit({
    auth: GITHUB_TOKEN,
});
const regexForReplacing = /```(.*?)```/gms;
async function PRDetails(repository, number) {
    // Obtain the PR details
    const { data } = await octokit.pulls.get({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: number,
    });
    return {
        title: data.title || "",
        description: data.body || "",
        patch_url: data.patch_url || "",
        diff_url: data.diff_url || "",
    };
}
exports.PRDetails = PRDetails;
async function commentOnPullRequest(event, body) {
    const bodyWithoutMarkdown = body.replace(regexForReplacing, "");
    try {
        const { data } = await octokit.rest.issues.createComment({
            owner: event.owner,
            repo: event.repo,
            issue_number: event.number,
            body: bodyWithoutMarkdown,
        });
        return data;
    }
    catch (error) {
        console.debug('commentOnPullRequest error', error);
    }
}
exports.commentOnPullRequest = commentOnPullRequest;
async function updateBody(owner, repo, pull_number, body) {
    const bodyWithoutMarkdown = body.replace(regexForReplacing, "");
    try {
        const { data } = await octokit.pulls.update({
            owner,
            repo,
            pull_number,
            body: bodyWithoutMarkdown,
        });
        return data;
    }
    catch (error) {
        console.debug('updateBody error', error);
    }
}
exports.updateBody = updateBody;
async function getPullRequestDiff(owner, repo, pull_number) {
    try {
        // Obtain the PR details
        const { data } = await octokit.pulls.get({
            owner,
            repo,
            pull_number,
            mediaType: { format: "diff" },
        });
        return data;
    }
    catch (error) {
        console.debug('gitDiff error', error);
    }
}
exports.getPullRequestDiff = getPullRequestDiff;
async function createReviewComment(owner, repo, pull_number, comments) {
    try {
        if (comments.length === 0) {
            const { data } = await octokit.pulls.createReview({
                owner,
                repo,
                pull_number,
                event: "APPROVE",
            });
            return data;
        }
        ;
        const { data } = await octokit.pulls.createReview({
            owner,
            repo,
            pull_number,
            event: "REQUEST_CHANGES",
            comments,
        });
        return data;
    }
    catch (error) {
        console.debug('basicError', error);
    }
}
exports.createReviewComment = createReviewComment;
async function compareCommits(event) {
    try {
        const { data } = await octokit.repos.compareCommits({
            headers: {
                accept: "application/vnd.github.v3.diff",
            },
            owner: event.owner,
            repo: event.repo,
            base: event.before || "",
            head: event.after || "",
        });
        return data;
    }
    catch (error) {
        console.debug('compareCommits error', error);
    }
}
exports.compareCommits = compareCommits;
