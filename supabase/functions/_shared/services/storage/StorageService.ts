import { createSupabaseClient } from "../../config/supabase.ts";

export class StorageService {
  private supabase: ReturnType<typeof createSupabaseClient>;

  constructor(authHeader?: string) {
    this.supabase = createSupabaseClient(authHeader);
  }

  async uploadFile(
    bucket: string, 
    filePath: string, 
    file: File, 
    options: { contentType?: string } = {}
  ): Promise<{ error?: { message: string } }> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, file, { 
        contentType: options.contentType || file.type 
      });

    return { error };
  }

  async deleteFile(bucket: string, filePath: string): Promise<{ error?: { message: string } }> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([filePath]);

    return { error };
  }

  async getPublicUrl(bucket: string, filePath: string): Promise<{ data?: { publicUrl: string }, error?: { message: string } }> {
    const { data, error } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { data, error };
  }

  createFilePath(userId: string, analysisId: string, fileName: string): string {
    return `${userId}/${analysisId}/${fileName}`;
  }
}
