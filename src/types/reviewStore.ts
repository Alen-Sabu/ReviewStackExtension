export type ReviewStatus = "pending" | "completed" | "failed"; 

export type ReviewMetadata = {
    commitHash: string; 
    shortHash: string; 
    author: string; 
    date: string; 
    message: string; 
    reviewVersion: number; 
    status: ReviewStatus; 
    model?: string; 
    error?: string; 
}

export type IndexEntry = {
    shortHash: string; 
    commitHash: string; 
    message: string; 
    date: string; 
    status: ReviewStatus; 
    summary?: string; 
}

export type ReviewIndex = {
    version: 1; 
    commits: IndexEntry[]; 
}

export type ReviewStackConfig = {
    enabled: boolean; 
    autoOpenReview: boolean; 
    maxDiffBytes: number;
}

export const DEFAULT_CONFIG: ReviewStackConfig = {
    enabled: true,  
    autoOpenReview: true, 
    maxDiffBytes: 200_000, 
}

export const EMPTY_INDEX: ReviewIndex = {
    version: 1, 
    commits: [], 
}