export class LoadingManager {
    private loadingEl?: HTMLElement;

    constructor ( private container: HTMLElement ) {}

    show() {
        if(this.loadingEl) return;
        
        this.loadingEl = document.createElement('div');
        this.loadingEl.className = 'loading';
        this.loadingEl.innerText = 'Reviewing...';

        this.container.appendChild(this.loadingEl);
    }

    hide() {
        this.loadingEl?.remove();
        this.loadingEl = undefined;
    }
}