import { Octokit } from '@octokit/rest';
import * as core from "@actions/core";

const GITHUB_TOKEN: string = core.getInput("github_token");

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});


export interface Event {
  owner: string;
  number: number;
  repo: any;
  before?: string;
  after?: string;
}

const regexForReplacing = /```(.*?)```/gms;


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
    patch_url: data.patch_url || "",
    diff_url: data.diff_url || "",
  };
}

export async function commentOnPullRequest(event: Event, body: string) {
  const bodyWithoutMarkdown = body.replace(regexForReplacing, "");
  try {
    const { data }  = await octokit.rest.issues.createComment({
      owner: event.owner,
      repo: event.repo,
      issue_number: event.number,
      body: bodyWithoutMarkdown,
    });
  
    return data;
  } catch (error) {
    console.debug('commentOnPullRequest error', error);
  }
}

export async function updateBody(owner: string, repo: string, pull_number: number, body: string) {
  const bodyWithoutMarkdown = body.replace(regexForReplacing, "");
  try {
    const { data } = await octokit.pulls.update({
      owner,
      repo,
      pull_number,
      body: bodyWithoutMarkdown,
    });
    return data;
  } catch (error) {
    console.debug('updateBody error', error);
  }
}


export async function getPullRequestDiff(owner: string, repo: string, pull_number: number) {
  try {
    // Obtain the PR details
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number,
      mediaType: { format: "diff" },
    });

    return data;
  } catch (error) {
    console.debug('gitDiff error', error);
  }
}


export async function createReviewComment(owner: string, repo: string, pull_number: number, comments: any[]) {
  try {
    if (comments.length === 0) {
      const { data } = await octokit.pulls.createReview({
        owner,
        repo,
        pull_number,
        event: "APPROVE",
      });

      return data;
    };
    const { data } = await octokit.pulls.createReview({
      owner,
      repo,
      pull_number,
      event: "REQUEST_CHANGES",
      comments,
    }); 
    return data;
  } catch (error) {
    console.debug('basicError', error);
  }
}

export async function compareCommits(event: Event) {
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
  } catch (error) {
    console.debug('compareCommits error', error);
  }
}
