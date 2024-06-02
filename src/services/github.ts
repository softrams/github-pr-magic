import { Octokit } from '@octokit/rest';
import * as core from "@actions/core"
import { RequestError } from '@octokit/types';
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

const regexForReplacing = /```[^\S\r\n]*[a-z]*\n.*?\n```/gms;


export async function PRDetails(repository: any, number: number) {
  // Obtain the PR details
  const { data } = await octokit.pulls.get({
    owner: repository.owner.login,
    repo: repository.name,
    pull_number: number,
  });

  // console.log('data', data);

  return {
    title: data.title || "",
    description: data.body || "",
    patch_url: data.patch_url || "",
    diff_url: data.diff_url || "",
  };
}

export async function commentOnPullRequest(event: Event, body: string) {
  // console.log('body', body)
  // console.log('bodyReg', body.replace(regexForReplacing, ""));
  const {data}  = await octokit.rest.issues.createComment({
    owner: event.owner,
    repo: event.repo,
    issue_number: event.number,
    body,
  });

  console.log('commentOnPullRequest', data);
}

export async function updateBody(owner: string, repo: string, pull_number: number, body: string) {
  try {
    const { data } = await octokit.pulls.update({
      owner,
      repo,
      pull_number,
      body: body.replace(regexForReplacing, ""),
    });
    console.log('updateBody', data);
  } catch (error) {
    console.log('updateBody error', error);
  }
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
  try {
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number,
      event: "REQUEST_CHANGES",
      comments,
    }); 
  } catch (error) {
    console.log('basicError', error);
    const newError = error as RequestError;
    if (newError.errors) {
      for (let index = 0; index < newError.errors.length; index++) {
        const error = newError.errors[index];
        console.log('createReviewComment error loops', error);
      }
    }
    console.log('createReviewComment error', newError);
  }
}

export async function compareCommits(event: Event) {
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
