import { z } from "https://esm.sh/zod@3.23.8";

export const UUIDSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
  message: "Invalid UUID format"
});

export const EmailSchema = z.string().email("Invalid email format");

export const FileUploadSchema = z.object({
  file: z.any()
    .refine((file) => file instanceof File, "Debe ser un archivo válido")
    .refine((file) => file.type === "application/pdf", "Solo se permiten archivos PDF")
    .refine((file) => file.size <= 15 * 1024 * 1024, "El archivo no debe superar los 15MB"),
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
