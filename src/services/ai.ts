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
         - Provide response in the Following JSON format: {"reviews": [{"lineNumber":  <line_number>, "review": "<review comment>"}]}.
         - Provide comments and suggestiosn IF there is something to improve, otherwise "reviews" should be a empty array of reviews.
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
