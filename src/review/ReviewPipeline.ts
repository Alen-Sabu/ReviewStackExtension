import * as vscode from "vscode";
import { DiffService } from "../git/DiffService";
import { ReviewStore } from "../store/ReviewStore";
import { CommitHistoryProvider } from "../views/CommitHistoryProvider";
import { LanguageModelReviewer } from "./LanguageModelReviewer";
import { PromptBuilder } from "./PromptBuilder";

export type ReviewPipelineOptions = {
  interactive: boolean;
};

export class ReviewPipeline {
  private running = false;

  constructor(
    private readonly store: ReviewStore,
    private readonly diff: DiffService,
    private readonly history: CommitHistoryProvider,
    private readonly statusBar: vscode.StatusBarItem,
  ) {}

  async reviewHead(options: ReviewPipelineOptions): Promise<void> {
    if (this.running) {
      return;
    }

    const config = await this.store.getConfig();
    if (!config.enabled) {
      if (options.interactive) {
        void vscode.window.showInformationMessage(
          "ReviewStack is disabled in .reviewstack/config.json",
        );
      }
      return;
    }

    this.running = true;
    this.statusBar.text = "$(sync~spin) ReviewStack: Reviewing…";
    try {
      const commit = await this.diff.getHeadCommit();

      if (await this.store.hasReview(commit.shortHash)) {
        if (options.interactive) {
          void vscode.window.showInformationMessage(
            `Review for ${commit.shortHash} already exists.`,
          );
          const existing = await this.store.getReviewUri(commit.shortHash);
          if (existing) {
            await vscode.window.showTextDocument(existing, { preview: false });
          }
        }
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `ReviewStack: reviewing ${commit.shortHash}…`,
          cancellable: false,
        },
        async () => {
          const commitDiff = await this.diff.getCommitDiff(commit.commitHash);

          await this.store.startReview({
            commitHash: commit.commitHash,
            shortHash: commit.shortHash,
            author: commit.author,
            date: commit.date,
            message: commit.message,
          });
          this.history.refresh();

          try {
            const prompt = new PromptBuilder().build(commit, commitDiff);
            const result = await new LanguageModelReviewer().review(prompt);

            await this.store.completeReview(commit.shortHash, result.markdown, {
              model: result.model,
              summary: result.summary,
            });
          } catch (aiError: unknown) {
            const msg =
              aiError instanceof Error ? aiError.message : String(aiError);
            await this.store.failReview(commit.shortHash, msg);
            this.history.refresh();
            throw aiError;
          }

          this.history.refresh();

          const shouldOpen = options.interactive || config.autoOpenReview;
          if (shouldOpen) {
            const uri = await this.store.getReviewUri(commit.shortHash);
            if (uri) {
              await vscode.window.showTextDocument(uri, { preview: false });
            }
          }

          if (options.interactive) {
            void vscode.window.showInformationMessage(
              `Saved review for ${commit.shortHash}`,
            );
          }
        },
      );
    } finally {
      this.running = false;
      this.statusBar.text = "$(check) ReviewStack";
    }
  }
}
