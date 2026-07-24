import * as vscode from "vscode"; 
import { ReviewStore } from "../store/ReviewStore";
import { DiffService } from "../git/DiffService";

export function registerCommands(
  store: ReviewStore, 
  diff: DiffService
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(
      "reviewstack.reviewLastCommit",
      async () => {
        try {
          const commit = await diff.getHeadCommit(); 

          if(await store.hasReview(commit.shortHash)) {
            void vscode.window.showInformationMessage(`Review for commit ${commit.shortHash} already exists.`);
            const existing = await store.getReviewUri(commit.shortHash);
            if(existing) {
              await vscode.window.showTextDocument(existing);
            }
            return;
          }

          const commitDiff = await diff.getCommitDiff(commit.commitHash);
          await store.startReview({
            commitHash: commit.commitHash, 
            shortHash: commit.shortHash, 
            author: commit.author, 
            date: commit.date, 
            message: commit.message,  
          });

          const markdown = [
            `# Review: ${commit.message}`,
            "",
            `**Commit:** \`${commit.shortHash}\``,
            `**Author:** ${commit.author}`,
            `**Date:** ${commit.date}`,
            "",
            "## Summary",
            "Git integration works. AI review not connected yet (step 4).",
            "",
            "## Changed files",
            ...commitDiff.files.map((f) => `- \`${f}\``),
            "",
            commitDiff.truncated
              ? "> Diff was truncated for size.\n"
              : "",
            "## Diff preview",
            "```diff",
            commitDiff.patch.slice(0, 4000),
            "```",
            "",
            "## Security",
            "_Pending AI_",
            "",
            "## Performance",
            "_Pending AI_",
            "",
            "## Bugs",
            "_Pending AI_",
            "",
            "## Suggestions",
            "_Pending AI_",
            "",
            "## Risk",
            "_Pending AI_",
          ].join("\n");

          await store.completeReview(commit.shortHash, markdown, {
            model: "none", 
            summary: "Git integration placeholder review", 
          }); 

          const uri = await store.getReviewUri(commit.shortHash); 
          if(uri) {
            await vscode.window.showTextDocument(uri);
          }

          void vscode.window.showInformationMessage(
            `Saved review for ${commit.shortHash}`, 
          ); 

        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(`Failed to review last commit: ${message}`);
        }
      }
     
    ),
    vscode.commands.registerCommand(
      "reviewstack.openReviewsFolder",
      async () => {
        await store.ensureInitialized();
        await vscode.commands.executeCommand(
          "revealFileInOS",
          vscode.Uri.file(store.rootDir),
        );
      },
    ),
  ];
}