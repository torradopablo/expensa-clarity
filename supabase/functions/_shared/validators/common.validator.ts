import { z } from "https://esm.sh/zod@3.23.8";

export const UUIDSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
  message: "Invalid UUID format"
});

export const EmailSchema = z.string().email("Invalid email format");

export const FileUploadSchema = z.object({
  file: z.instanceof(File, { message: "Invalid file" }),
  analysisId: UUIDSchema,
});

export function validateUUID(uuid: unknown): string {
  return UUIDSchema.parse(uuid);
}

export function validateEmail(email: unknown): string {
  return EmailSchema.parse(email);
}

export function validateFileUpload(data: unknown) {
  return FileUploadSchema.parse(data);
}
