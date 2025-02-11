import { MinioClient } from "@/core/lib/minio";
import { StorageRepository } from "../repositories/storage.repository";
import { db } from "@/db";
import { ApiError } from "@/core/lib/error";
import { AuthService } from "@/auth/services/auth.service";
import { SIZE_1M, TUpdateStorageSchema } from "../schema";
import { S3Error } from "minio";

export class StorageService {
  static async deleteObject({
    websiteId,
    filename,
    scope,
  }: {
    websiteId: string;
    filename: string;
    scope: string;
  }) {
    try {
      const expectedScope = ["storage:delete"];
      const storage = await StorageService.verifyStoragePermission(
        websiteId,
        scope,
        expectedScope
      );
      // get object stats
      const stat = await MinioClient.statObject(storage.bucket, filename);
      await MinioClient.removeObject(storage.bucket, filename);

      // update storage remaining
      const remaining = storage.remaining + stat.size;
      await StorageService.updateStorage(storage.id, { remaining });
    } catch (e) {
      if (e instanceof ApiError) {
        throw e;
      }

      if (e instanceof S3Error) {
        if (e.code === "NotFound") {
          throw ApiError.build("ErrNotFound");
        }
      }

      console.error(e);
      throw ApiError.build("ErrUnknown");
    }
  }

  static async getObject({
    websiteId,
    filename,
    scope,
  }: {
    websiteId: string;
    filename: string;
    scope: string;
  }) {
    try {
      const expectedScope = ["storage:read"];
      const storage = await StorageService.verifyStoragePermission(
        websiteId,
        scope,
        expectedScope
      );
      const obj = await MinioClient.getObject(storage.bucket, filename);
      const bodyBuffer = await StorageService.streamToBuffer(obj);
      return bodyBuffer;
    } catch (e) {
      if (e instanceof S3Error) {
        if (e.code === "NoSuchKey") {
          throw ApiError.build("ErrNotFound");
        }
      }

      console.error(e);
      throw ApiError.build("ErrUnknown");
    }
  }

  static async getStorage(id: string) {
    return await StorageRepository.get(db, id);
  }

  static async getStorageByWebsiteId(websiteId: string) {
    return await StorageRepository.getByWebsiteId(db, websiteId);
  }

  static async putObject({
    websiteId,
    filename,
    size,
    scope,
    expiry = 60,
  }: {
    websiteId: string;
    filename: string;
    size: number;
    scope: string;

    expiry?: number;
  }) {
    if (size > 100 * SIZE_1M) {
      throw ApiError.build("ErrConflict");
    }

    const expectedScope = ["storage:create"];
    const storage = await StorageService.verifyStoragePermission(
      websiteId,
      scope,
      expectedScope
    );

    try {
      // check for remaining storage
      const remaining = storage.remaining - size;
      if (remaining <= 0) {
        throw ApiError.build("ErrConflict");
      }

      // generate presignedUrl for upload
      const result = await MinioClient.presignedUrl(
        "PUT",
        storage.bucket,
        filename,
        expiry,
        { "X-Amz-Content-Length": String(size) }
      );

      // update storage remaining
      await StorageService.updateStorage(storage.id, { remaining });

      return result;
    } catch (e) {
      console.error(e);
      throw ApiError.build("ErrUnknown");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async streamToBuffer(readableStream: any) {
    const chunks = [];
    for await (const chunk of readableStream) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  }

  static async updateStorage(storageId: string, data: TUpdateStorageSchema) {
    return await StorageRepository.update(db, storageId, data);
  }

  static async verifyStoragePermission(
    websiteId: string,
    scope: string,
    expectedScope: string[]
  ) {
    let storage;
    try {
      storage = await this.getStorageByWebsiteId(websiteId);
      if (!storage) {
        throw ApiError.build("ErrNotFound");
      }

      const claim = AuthService.scope.init(scope);
      // check if scope is exists
      if (claim.length == 0) {
        throw ApiError.build("ErrForbidden", {
          message: "Insufficient granted permission",
        });
      }

      // check if needed scope(s) is matching
      for (const currScope of expectedScope) {
        if (!claim.get(currScope)) {
          throw ApiError.build("ErrForbidden", {
            message: "Insufficient granted permission",
          });
        }
      }
    } catch (e) {
      if (e instanceof ApiError) {
        throw e;
      }

      console.error(e);
      throw ApiError.build("ErrUnknown");
    }

    return storage;
  }
}
