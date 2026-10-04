// Tests read many JSON bodies; let them be `any` here only (app code stays strict).
export {};
declare global {
  interface Response {
    json(): Promise<any>;
  }
}
