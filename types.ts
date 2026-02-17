
export interface Scene {
  text: string;
  image: string;
  audioBlob: Blob;
  audioUrl: string;
}

export enum AppStep {
  SETUP = 'setup',
  LOADING = 'loading',
  PLAYER = 'player'
}

export interface ScriptLine {
  text: string;
}
