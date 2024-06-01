import { Chunk, File } from "parse-diff";
import * as core from '@actions/core';
import { Details } from "..";
import OpenAI from "openai";

const OPEN_AI_KEY: string = core.getInput("openai_api_key"); 

const openai = new OpenAI({
    apiKey: OPEN_AI_KEY,
})

export async function createMessage(file: File, chunk: Chunk, details: Details) {
    const message = `
        Your requirement is to review pull request.
        Instructions below:
         - Provide response in the Following JSON format: {"reviews": [{"lineNumber":  <line_number>, "review": "<review comment>", "required_changed": "<true or false>"}]}.
         - Provide comments and suggestions IF there is something to improve, otherwise "reviews" should be a empty array of reviews.
         - If you want to request changes that should be required, set "required_changed" to true.
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
        model: "gpt-4-1106-preview",
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
    console.log('resss', JSON.parse(resss));
    return JSON.parse(resss).summary; 
}

export async function summaryAllMessages(summaries: any[]) {
    const message = `
        Your requirement is to merge all the summaries into one summary.
        Instructions below:
         - Provide a detailed summary of all the pull request summaries.
         - Provide the written summary in the following JSON format: {"summary": "<summary>", "changes": "<changes>", "typeChanges": "<typeChanges", "checklist": "<checklist>"}.
         - Please write the result in Markdown Format.


        Summaries to review: ${summaries.map((s) => s.changes).join(", ")}
    `

    const response = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
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
    console.log('resss', JSON.parse(resss));
}


export async function validateCodeViaAI(file: File, chunk: Chunk, details: Details) {
    try {
        const message = await createMessage(file, chunk, details);
        const response = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
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



    // const response = await aiService(message);
    // console.log('response', response);
    // return response;
}
