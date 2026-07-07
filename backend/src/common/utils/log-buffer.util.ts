export class LogBuffer {
  private static readonly MAX_LOGS = 200;
  private static logs: string[] = [];

  static initialize() {
    const originalWrite = process.stdout.write;
    process.stdout.write = function (chunk: any, ...args: any[]) {
      LogBuffer.addLog(chunk.toString());
      return originalWrite.apply(process.stdout, [chunk, ...args]);
    };

    const originalErrorWrite = process.stderr.write;
    process.stderr.write = function (chunk: any, ...args: any[]) {
      LogBuffer.addLog(`[ERROR] ${chunk.toString()}`);
      return originalErrorWrite.apply(process.stderr, [chunk, ...args]);
    };
  }

  private static addLog(text: string) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    for (const line of lines) {
      // Append timestamp and filter out terminal color escape characters if any
      const cleaned = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
      LogBuffer.logs.push(`[${new Date().toISOString()}] ${cleaned}`);
      if (LogBuffer.logs.length > LogBuffer.MAX_LOGS) {
        LogBuffer.logs.shift();
      }
    }
  }

  static getLogs(): string[] {
    return LogBuffer.logs;
  }
}
