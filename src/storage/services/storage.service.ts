import { MinioClient } from "@/core/lib/minio";
import path from "path";
import { StorageRepository } from "../repositories/storage.repository";
import { db } from "@/db";
import { ApiError } from "@/core/lib/error";

export class StorageService {
  static async getStorageQuota(clientId: string) {
    return await StorageRepository.get(db, clientId);
  }

  static async deleteObject(bucket: string, filename: string, prefix = "") {
    const location = path.posix.join(prefix, filename);
    console.log(bucket, location);
  }

  static async getObject(bucket: string, filename: string, prefix = "") {
    const location = path.posix.join(prefix, filename);
    console.log(bucket, location);
  }

  static async putObject({
    clientId,
    filename,
    size,
    prefix = "",
    expiry = 0,
  }: {
    clientId: string;
    filename: string;
    size: number;
    prefix?: string;
    expiry?: number;
  }) {
    const minSize = size - 1000 > 0 ? size - 1000 : 0;
    const maxSize = size + 1000;
    const sizeRange = `${minSize}-${maxSize}`;

    try {
      const storage = await this.getStorageQuota(clientId);
      if (!storage) {
        throw ApiError.build({ code: "ErrNotFound" });
      }

      const result = await MinioClient.presignedUrl(
        "PUT",
        storage.bucket,
        filename,
        expiry,
        { prefix, "content-length-range": sizeRange }
      );

      return result;
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "ErrUnknown") {
          e.cause = "";
        }
      }
      console.error(e);
    }
  }
}
