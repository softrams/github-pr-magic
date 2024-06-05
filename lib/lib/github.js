"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitDiff = exports.PRDetails = void 0;
const rest_1 = require("@octokit/rest");
const core_1 = __importDefault(require("@actions/core"));
const GITHUB_TOKEN = core_1.default.getInput("GITHUB_TOKEN");
const octokit = new rest_1.Octokit({
    auth: GITHUB_TOKEN,
});
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
    };
}
exports.PRDetails = PRDetails;
async function gitDiff(owner, repo, pull_number) {
    // Obtain the PR details
    const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number,
        mediaType: { format: "diff" },
    });
    return data;
}
exports.gitDiff = gitDiff;
