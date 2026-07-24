export type CommitInfo = {
    commitHash: string; 
    shortHash: string; 
    author: string; 
    date: string; 
    message: string; 
}; 

export type CommitDiff = {
    commitHash: string; 
    files: string[];
    patch: string; 
    truncated: boolean; 
}