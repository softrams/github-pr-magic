import { Octokit } from '@octokit/rest';
import * as core from "@actions/core"
import { RequestError } from '@octokit/types';
const GITHUB_TOKEN: string = core.getInput("github_token");

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});


export interface SummaryBody {
  summary: string;
  changes: string;
  typeChanges: string;
  checklist: string;
}


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

export async function updateBody(owner: string, repo: string, pull_number: number, body: SummaryBody) {
  const message = `
    # Pull Request Summary 
    ${body.summary}

    ${body.changes}

    ## Checklist
    ${body.checklist}

    ${body.typeChanges}
  `;

  try {
    const { data } = await octokit.pulls.update({
      owner,
      repo,
      pull_number,
      body: message,
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
    const newError = error as RequestError;
    if (newError.errors) {
      for (let index = 0; index < newError.errors.length; index++) {
        const error = newError.errors[index];
        console.log('createReviewComment error loops', error);
      }
    }
    console.log('createReviewComment error', newError.errors);
  }
}
