import * as fs from "fs/promises"; 
import * as path from "path"; 
import * as vscode from "vscode"; 
import { DEFAULT_CONFIG, EMPTY_INDEX, IndexEntry, ReviewIndex, ReviewMetadata, ReviewStackConfig } from "../types/reviewStore"; 

export class ReviewStore {
    constructor(private readonly workspaceRoot: string) {}

    get rootDir(): string {
        return path.join(this.workspaceRoot, ".reviewstack"); 
    }

    get commitsDir(): string {
        return path.join(this.rootDir, "commits"); 
    }

    commitDir(shortHash: string): string {
        return path.join(this.commitsDir, shortHash); 
    }

    reviewPath(shortHash: string): string {
        return path.join(this.commitDir(shortHash), "review.md"); 
    }

    metadataPath(shortHash: string): string {
        return path.join(this.commitDir(shortHash), "metadata.json"); 
    }

    private async writeJson(filePath: string, data: unknown): Promise<void> {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8"); 
    }

    private async readJson<T>(filePath: string, fallback: T): Promise<T> {
        try {
            const raw = await fs.readFile(filePath, "utf-8"); 
            return JSON.parse(raw) as T; 
        } catch (error) {
            return fallback; 
        }
    }

    async ensureInitialized(): Promise<void> {
        await fs.mkdir(this.commitsDir, { recursive: true}); 

        const configPath = path.join(this.rootDir, "config.json"); 
        const indexPath = path.join(this.rootDir, "index.json"); 

        try {
            await fs.access(configPath); 
        } catch {
            await this.writeJson(configPath, DEFAULT_CONFIG); 
        }

        try {
            await fs.access(indexPath); 
        } catch {
            await this.writeJson(indexPath, EMPTY_INDEX); 
        }
    }

    async getConfig(): Promise<ReviewStackConfig> {
        await this.ensureInitialized(); 
        return this.readJson(
            path.join(this.rootDir, "config.json"),
            DEFAULT_CONFIG
        ); 
    }

    async getIndex(): Promise<ReviewIndex> {
        await this.ensureInitialized(); 
        return this.readJson(
            path.join(this.rootDir, "index.json"),
            EMPTY_INDEX
        ); 
    }

    private async saveIndex(index: ReviewIndex): Promise<void> {
        await this.writeJson(
            path.join(this.rootDir, "index.json"),
            index
        )
    }

    async hasReview(shortHash: string): Promise<boolean> {
        try {
            await fs.access(this.commitDir(shortHash)); 
            return true; 
        } catch {
            return false; 
        }
    }

    private async upsertIndex(entry: IndexEntry): Promise<void> {
        const index = await this.getIndex();  

        index.commits = [
            entry, 
            ...index.commits.filter((c) => c.shortHash !== entry.shortHash),
        ]; 
        await this.saveIndex(index); 
    }

    async startReview(
        meta: Omit<ReviewMetadata, "status" | "reviewVersion">, 
    ): Promise<void> {
        await this.ensureInitialized(); 
        await fs.mkdir(this.commitDir(meta.shortHash), { recursive: true}); 

        const metadata: ReviewMetadata = {
            ...meta,  
            reviewVersion: 1,  
            status: "pending",  
        }

        await this.writeJson(this.metadataPath(meta.shortHash), metadata); 
        await this.upsertIndex({
            shortHash: meta.shortHash,
            commitHash: meta.commitHash,
            message: meta.message, 
            date: meta.date, 
            status: "pending", 
        })
    }

    async completeReview(
        shortHash: string, 
        markdown: string, 
        extras?: { model?: string; summary?: string }, 
    ): Promise<void> {
        const meta = await this.readJson<ReviewMetadata | null> (
            this.metadataPath(shortHash),
            null
        );

        if(!meta) {
            throw new Error(`Review not found for ${shortHash}`); 
        }

        meta.status = "completed"; 
        if(extras?.model) {
            meta.model = extras.model; 
        }

        await fs.writeFile(this.reviewPath(shortHash), markdown, "utf-8"); 
        await this.writeJson(this.metadataPath(shortHash), meta); 

        await this.upsertIndex({
            shortHash: shortHash,
            commitHash: meta.commitHash,
            message: meta.message, 
            date: meta.date, 
            status: "completed", 
            summary: extras?.summary, 
        })
    }

    async failReview(shortHash: string, error: string): Promise<void> {
        const meta = await this.readJson<ReviewMetadata | null> (
            this.metadataPath(shortHash),
            null, 
        );
        if(!meta) return; 

        meta.status = "failed"; 
        meta.error = error;  
        
        await this.writeJson(this.metadataPath(shortHash), meta); 
        await this.upsertIndex({
            shortHash: shortHash,
            commitHash: meta.commitHash,
            message: meta.message, 
            date: meta.date, 
            status: "failed", 
        })
    }

    async getReviewUri(shortHash: string): Promise<vscode.Uri | undefined> {
        try {
            await fs.access(this.reviewPath(shortHash)); 
            return vscode.Uri.file(this.reviewPath(shortHash)); 
        } catch {
            return undefined; 
        }
    }
}

