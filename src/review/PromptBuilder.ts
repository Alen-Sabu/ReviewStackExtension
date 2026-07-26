import type { CommitDiff, CommitInfo } from "../git/types";

export type ReviewPrompt = {
    system: string; 
    user: string;
};

export class PromptBuilder {
    build(commit: CommitInfo, diff: CommitDiff): ReviewPrompt {
        const system = [
            "You are ReviewStack, a senior code reviewer.",
            "Review ONLY the provided commit diff.",
            "Do not invent files or changes that are not in the diff.",
            "Respond in Markdown with these exact headings:",
            "## Summary",
            "## Security",
            "## Performance",
            "## Bugs",
            "## Suggestions",
            "## Risk",
            "Be concise and specific. Cite file paths from the diff when possible.",
          ].join("\n");

          const user = [
            `Commit: ${commit.shortHash}`,
            `Author: ${commit.author}`,
            `Date: ${commit.date}`,
            `Message: ${commit.message}`,
            "",
            "Changed files:",
            ...diff.files.map((f) => `- ${f}`),
            "",
            diff.truncated
              ? "NOTE: Diff was truncated due to size. Review what is present."
              : "",
            "",
            "Diff:",
            "```diff",
            diff.patch,
            "```",
          ]
            .filter((line) => line !== undefined)
            .join("\n");

        return { system, user };
    }
}