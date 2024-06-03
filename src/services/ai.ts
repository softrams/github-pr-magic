import { Chunk, File } from "parse-diff";
import * as core from '@actions/core';
import { Details } from "..";
import OpenAI from "openai";

const OPEN_AI_KEY: string = core.getInput("openai_api_key"); 
const OPEN_AI_MODEL: string = core.getInput("openai_model");

const openai = new OpenAI({
    apiKey: OPEN_AI_KEY,
})

export async function createMessage(file: File, chunk: Chunk, details: Details) {
    const message = `
        Your requirement is to review pull request.
        Instructions below:
         - Provide response in the Following JSON format: {"reviews": [{"lineNumber":  <line_number>, "review": "<review comment>"}]}.
         - Do not give positive comments or compliments.
         - Provide comments and suggestions IF there is something to improve, otherwise "reviews" should be a empty array of reviews.
         - REQUIRED: Do not suggest adding comments to the code.
         - REQUIRED: Do not suggest adding a new line at the end of a file.
         - Please write comment in Github Markdown Format.
         - Use the given pr description only for the overall context
        
        Review the following code diff in the file "${file.to}" and take the pull request title into account when writing your response.

        Pull Request title: ${details.title}

        Pull Request description: 

        ${details.description}

        Git diff to review:

        ${chunk.content}
        ${chunk.changes
          // @ts-expect-error - ln and ln2 exists where needed
          .map((c) => `${c.ln ? c.ln : c.ln2} ${c.content}`)
          .join("\n")}
    
    `

    return message;
}

export async function prSummaryCreation(file: File, chunk: Chunk, details: Details) {
    const message = `
        Your requirement is to create a Pull Request Summary for this Pull Request.
        Instructions below:
         - Provide a detailed summary of the pull request based on the diff url below.
         - Please write the result in Github Markdown Format.
         - Provide the written summary in the following JSON format: {"summary": [{"changes": "<changes>", "typeChanges": "<typeChanges", "checklist", "<checklist>"}]}.
         
        
        Review the following code diff in the files "${file.to}", and take the pull request title: ${details.title} into account when writing your response.

        Pull Request title: ${details.title}

        Files to review: ${file.to}

        Git diff to review:

        ${chunk.content}
        ${chunk.changes
          // @ts-expect-error - ln and ln2 exists where needed
          .map((c) => `${c.ln ? c.ln : c.ln2} ${c.content}`)
          .join("\n")}
    `

    const response = await openai.chat.completions.create({
        model: OPEN_AI_MODEL,
        response_format: {
            type: "json_object",
        },
        messages: [
            {
                role: "system",
                content: message,
            },
        ],
    });

    const resss = response.choices[0].message?.content?.trim() || "{}";
    return JSON.parse(resss).summary; 
}

export async function obtainFeedback(file: File, chunk: Chunk, details: Details) {
    const message = `
        Your requirement is to create a Feedback for this Pull Request.
        Instructions below:
         - Provide a detailed feedback of the pull request based on the diff below.
         - Please write the result in Github Markdown Format.
         - Provide the written feedback in the following JSON format: {"feedback": [{"changesOverview": "<changesOverview>", "feedback": "<feedback", "improvements", "<improvements>", "conclusion": "<conclusion>"}]}.
        
        Review the following code diff in the files "${file.to}", and take the pull request title: ${details.title} into account when writing your response.

        Pull Request title: ${details.title}

        Files to review: ${file.to}

        Git diff to review:

        ${chunk.content}
        ${chunk.changes
          // @ts-expect-error - ln and ln2 exists where needed
          .map((c) => `${c.ln ? c.ln : c.ln2} ${c.content}`)
          .join("\n")}
    `

    const response = await openai.chat.completions.create({
        model: OPEN_AI_MODEL,
        response_format: {
            type: "json_object",
        },
        messages: [
            {
                role: "system",
                content: message,
            },
        ],
    });

    const resss = response.choices[0].message?.content?.trim() || "{}";
    return JSON.parse(resss).feedback; 
}

export async function summaryOfAllFeedback(feedbacks: any[]) {
    const systemMessage = `
        Your requirement is to merge all the feedbacks into one feedback.
        Instructions below:
         - Please write the result in Github Markdown Format.
         - Provide the written feedback as a Github Pull Request Body.
         - Please format each header as a H2 header.
    `
    const message = `
        Feedback to review: 
        ${feedbacks.map((f) => f.changesOverview).join(", ")}
        ${feedbacks.map((f) => f.feedback).join(", ")}
        ${feedbacks.map((f) => f.improvements).join(", ")}
        ${feedbacks.map((f) => f.conclusion).join(", ")}
    `

    const response = await openai.chat.completions.create({
        model: OPEN_AI_MODEL,
        messages: [
            {
                role: "system",
                content: systemMessage,
            },
            {
                role: "user",
                content: message,
            },
        ],
    });

    const resss = response.choices[0].message?.content?.trim() || "{}";
    return resss;
}

export async function summaryAllMessages(summaries: any[]) {
    const systemMessage = `
        Your requirement is to merge all the summaries into one summary.
        Instructions below:
         - Please write the result in Github Markdown Format.
         - Provide the written summary written as a Github Pull Request Body.
    `
    const message = `
        Summaries to review: ${summaries.map((s) => s.changes).join(", ")}
    `

    const response = await openai.chat.completions.create({
        model: OPEN_AI_MODEL,
        messages: [
            {
                role: "system",
                content: systemMessage,
            },
            {
                role: "user",
                content: message,
            },
        ],
    });

    const resss = response.choices[0].message?.content?.trim() || "{}";
    return resss;
}


export async function validateCodeViaAI(file: File, chunk: Chunk, details: Details) {
    try {
        const message = await createMessage(file, chunk, details);
        const response = await openai.chat.completions.create({
            model: OPEN_AI_MODEL,
            response_format: {
                type: "json_object",
            },
            messages: [
                {
                    role: "system",
                    content: message,
                },
            ],
        });


        const resss = response.choices[0].message?.content?.trim() || "{}";
        return JSON.parse(resss).reviews;
    } catch (error) {
        console.log('validateCodeViaAI error', error)
    }
}
