import { Octokit } from '@octokit/rest';
import * as core from "@actions/core"
const GITHUB_TOKEN: string = core.getInput("github_token");

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});


export async function PRDetails(repository: any, number: number) {
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


export async function gitDiff(owner: string, repo: string, pull_number: number) {
  // Obtain the PR details
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
    mediaType: { format: "diff" },
  });

  return data;
}


export async function createReviewComment(owner: string, repo: string, pull_number: number, comments: any[]) {
  // Create a review comment
  return await octokit.pulls.createReview({
    owner,
    repo,
    pull_number,
    event: "COMMENT",
    comments,
  }); 
}