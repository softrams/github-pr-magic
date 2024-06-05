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
exports.validateCodeViaAI = exports.summaryAllMessages = exports.summaryOfAllFeedback = exports.obtainFeedback = exports.prSummaryCreation = exports.createMessage = void 0;
const core = __importStar(require("@actions/core"));
const AiService = __importStar(require("openai"));
const OPEN_AI_KEY = core.getInput("openai_api_key");
const OPEN_AI_MODEL = core.getInput("openai_model");
let openai;
if (OPEN_AI_KEY) {
    openai = new AiService.OpenAI({
        apiKey: OPEN_AI_KEY,
    });
}
else {
    console.debug("OpenAI API Key not found");
}
async function createMessage(file, chunk, details) {
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
    
    `;
    return message;
}
exports.createMessage = createMessage;
async function prSummaryCreation(file, chunk, details) {
    var _a, _b;
    try {
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
        `;
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
        const resss = ((_b = (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim()) || "{}";
        return JSON.parse(resss).summary;
    }
    catch (error) {
        console.debug('prSummaryCreation error', error);
    }
}
exports.prSummaryCreation = prSummaryCreation;
async function obtainFeedback(file, chunk, details) {
    var _a, _b;
    try {
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
        `;
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
        const resss = ((_b = (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim()) || "{}";
        return JSON.parse(resss).feedback;
    }
    catch (error) {
        console.debug('obtainFeedback error', error);
    }
}
exports.obtainFeedback = obtainFeedback;
async function summaryOfAllFeedback(feedbacks) {
    var _a, _b;
    try {
        const systemMessage = `
            Your requirement is to merge all the feedbacks into one feedback.
            Instructions below:
            - Please write the result in Github Markdown Format.
            - Provide the written feedback as a Github Pull Request Body.
            - Please format each header as a H2 header.
        `;
        const message = `
            Feedback to review: 
            ${feedbacks.map((f) => f.changesOverview).join(", ")}
            ${feedbacks.map((f) => f.feedback).join(", ")}
            ${feedbacks.map((f) => f.improvements).join(", ")}
            ${feedbacks.map((f) => f.conclusion).join(", ")}
        `;
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
        const resss = (_b = (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim();
        return resss;
    }
    catch (error) {
        console.debug('summaryOfAllFeedback error', error);
    }
}
exports.summaryOfAllFeedback = summaryOfAllFeedback;
async function summaryAllMessages(summaries) {
    var _a, _b;
    try {
        const systemMessage = `
            Your requirement is to merge all the summaries into one summary.
            Instructions below:
            - Please write the result in Github Markdown Format.
            - Provide the written summary written as a Github Pull Request Body.
        `;
        const message = `
            Summaries to review: ${summaries.map((s) => s.changes).join(", ")}
        `;
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
        const resss = (_b = (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim();
        return resss;
    }
    catch (error) {
        console.debug('summaryAllMessages error', error);
    }
}
exports.summaryAllMessages = summaryAllMessages;
async function validateCodeViaAI(file, chunk, details) {
    var _a, _b;
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
        const resss = ((_b = (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim()) || "{}";
        return JSON.parse(resss).reviews;
    }
    catch (error) {
        console.log('validateCodeViaAI error', error);
    }
}
exports.validateCodeViaAI = validateCodeViaAI;
