import { Octokit } from '@octokit/rest';
import core from "@actions/core";
const GITHUB_TOKEN: string = core.getInput("GITHUB_TOKEN");

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