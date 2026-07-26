import { execFile } from "child_process";
import { promisify } from "util";
import { CommitDiff, CommitInfo } from "./types";

const execFileAsync = promisify(execFile);

export class DiffService {
    private maxDiffBytes: number;

    constructor(
        private readonly workspaceRoot: string,
        maxDiffBytes = 200_000,
    ) {
        this.maxDiffBytes = maxDiffBytes;
    }

    setMaxDiffBytes(maxDiffBytes: number): void {
        this.maxDiffBytes = maxDiffBytes;
    }

    private async git(args: string[]): Promise<string> {
        const { stdout } = await execFileAsync("git", args, {
            cwd: this.workspaceRoot, 
            maxBuffer: 10 * 1024 * 1024, 
            windowsHide: true, 
        }); 
        return stdout.trimEnd(); 
    }

    async assertGitRepo(): Promise<void> {
        try {
            await this.git(["rev-parse", "--is-inside-work-tree"]);
        } catch (error) {
            throw new Error("Not a git repository. Please initialize a git repository in this workspace.");
        }
    }

    async getHeadCommit(): Promise<CommitInfo> {
        await this.assertGitRepo(); 

        // %H full hash | %an author | %aI ISO date | %s subject 
        const raw = await this.git([
            "log", 
            "-1", 
            "--pretty=format:%H%n%an%n%aI%n%s", 
        ])

        const [commitHash, author, date, ...messageParts] = raw.split("\n");
        if(!commitHash) {
            throw new Error("No commits found in this repository.");
        } 

        return {
            commitHash, 
            shortHash: commitHash.slice(0, 7), 
            author: author, 
            date: date ?? new Date().toISOString(), 
            message: messageParts.join("\n") || "No message", 
        }
    }

    /** True only for `git commit` / `git commit --amend`, not checkout/merge/rebase/etc. */
    async wasLastReflogACommit(): Promise<boolean> {
        try {
            const subject = await this.git(["reflog", "-1", "--pretty=%gs"]);
            return /^(commit|commit \(amend\)):/.test(subject);
        } catch {
            return false;
        }
    }

    async getCommitDiff(commitHash: string): Promise<CommitDiff> {
        await this.assertGitRepo(); 

        // first commit 
        const parentCountRaw = await this.git([
            "rev-list", 
            "--parents", 
            "-n", 
            "1", 
            commitHash, 
        ]); 

        const tokens = parentCountRaw.split(/\s+/);
        const isRootCommit = tokens.length <= 1; 

        let patch: string;
        let filesRaw: string; 

        if (isRootCommit) {
            patch = await this.git(["show", "--format=", "--patch", commitHash]);
            filesRaw = await this.git([
                "show",
                "--format=",
                "--name-only",
                commitHash,
            ]);
        } else {
            patch = await this.git([
                "diff",
                `${commitHash}^`,
                commitHash,
                "--",
            ]);
            filesRaw = await this.git([
                "diff",
                "--name-only",
                `${commitHash}^`,
                commitHash,
                "--",
            ]);
        }

        const files = filesRaw
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        let truncated = false;
        if (Buffer.byteLength(patch, "utf8") > this.maxDiffBytes) {
            patch =
                patch.slice(0, this.maxDiffBytes) +
                "\n\n...[diff truncated]...\n";
            truncated = true;
        }

        return { commitHash, files, patch, truncated };
    }
}