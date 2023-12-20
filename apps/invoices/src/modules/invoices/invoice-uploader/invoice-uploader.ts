export interface InvoiceUploader {
  upload(fileUnit8Array: Uint8Array, asName: string): Promise<string>;
}
