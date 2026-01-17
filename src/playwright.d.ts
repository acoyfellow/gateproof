declare module "playwright" {
  export const chromium: {
    launch(options?: { headless?: boolean }): Promise<Browser>;
  };
  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }
  export interface Page {
    goto(url: string): Promise<void>;
  }
}
