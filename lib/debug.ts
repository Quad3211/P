export function logError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}

export function logInfo(context: string, ...args: any[]) {
  console.log(`[${context}]`, ...args);
}