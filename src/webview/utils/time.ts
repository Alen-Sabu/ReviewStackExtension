export function formatTime(): string {
    return new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    })
}