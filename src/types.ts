export enum Level {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface Message {
  level: Level
  file?: string
  message: string
}

export interface Checker {
  (): Promise<Array<Message>>
}
