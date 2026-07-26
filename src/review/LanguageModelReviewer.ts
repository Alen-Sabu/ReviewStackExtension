import * as vscode from "vscode"; 
import { ReviewPrompt } from "./PromptBuilder"; 

export type ReviewResult = {
    markdown: string; 
    model: string; 
    summary?: string; 
}; 

export class LanguageModelReviewer {
    async review(prompt: ReviewPrompt): Promise<ReviewResult> {
        const models = await vscode.lm.selectChatModels({

        }); 

        if(!models.length) {
            throw new Error(
                "No language model available. Install/enable GitHub Copilot Chat (or another LM provider) and try again.",
            )
        }

        const model = models.find((m) => /gpt|claude|gemini/i.test(m.name)) ?? models[0];

        const chatMessage = [
            vscode.LanguageModelChatMessage.User(prompt.system),
            vscode.LanguageModelChatMessage.User(prompt.user), 
        ]

        let response: vscode.LanguageModelChatResponse; 
        try {
            response = await model.sendRequest(
                chatMessage, 
                {}, 
                new vscode.CancellationTokenSource().token, 
            ); 
        } catch (error: unknown) {
            if (error instanceof vscode.LanguageModelError) {
                throw new Error(`Language model error: ${error.message}`);
              }
            throw error;
        }

        let markdown = ""; 
        for await (const chunk of response.text) {
            markdown += chunk;
        }

        markdown = markdown.trim(); 
        if(!markdown){
            throw new Error("No response from language model.");
        }

        const summary = extractSummary(markdown);

        return {
            markdown: ensureTitle(markdown),
            model: `${model.vendor}/${model.family || model.name}`,
            summary, 
        }
    }
}

function extractSummary(markdown: string): string | undefined {
    const match = markdown.match(/##\s*Summary\s*\n+([\s\S]*?)(?=\n##\s|\n*$)/i);
    if (!match) return undefined;
    return match[1].trim().split("\n")[0]?.slice(0, 160);
}

function ensureTitle(markdown: string): string {
    if (markdown.startsWith("#")) return markdown;
    return `# Commit review\n\n${markdown}`;
}