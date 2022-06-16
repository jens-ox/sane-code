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
  (validator: Record<string, ValidatorMethod>): Promise<Array<Message>>
}

export interface ValidatorMethod {
  (data: unknown): Promise<Array<Message>>
}
