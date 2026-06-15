export const Logger = {
  info: (msg: string, ...args: any[]) => {
    const formatted = `[FEMME INFO] ${msg}`;
    console.log(formatted, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    const formatted = `[FEMME WARN] ${msg}`;
    console.warn(formatted, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    const formatted = `[FEMME ERROR] ${msg}`;
    console.error(formatted, ...args);
  }
};

export default Logger;
