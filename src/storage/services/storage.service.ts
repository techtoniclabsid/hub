import { MinioClient } from "@/core/lib/minio";
import path from "path";
import { StorageRepository } from "../repositories/storage.repository";
import { db } from "@/db";
import { ApiError } from "@/core/lib/error";
import { AuthService } from "@/auth/services/auth.service";
import { SIZE_1M, TUpdateStorageSchema } from "../schema";
import { S3Error } from "minio";

export class StorageService {
  static async deleteObject({
    clientId,
    filename,
    scope,
    prefix = "",
  }: {
    clientId: string;
    filename: string;
    scope: string;
    prefix?: string;
  }) {
    try {
      const expectedScope = ["storage:delete"];
      const storage = await StorageService.verifyStoragePermission(
        clientId,
        scope,
        expectedScope
      );
      const location = path.posix.join(prefix, filename);
      // get object stats
      const stat = await MinioClient.statObject(storage.bucket, location);
      await MinioClient.removeObject(storage.bucket, location);

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

  // static async getObject({
  //   clientId,
  //   filename,
  //   scope,
  //   prefix,
  // }: {
  //   clientId: string;
  //   filename: string;
  //   scope: string;
  //   prefix?: string;
  // }) {
  //   const expectedScope = ["storage:read"];
  //   const storage = await StorageService.verifyStoragePermission(clientId, scope, expectedScope);
  //   const obj =
  // }

  static async getStorage(id: string) {
    return await StorageRepository.get(db, id);
  }

  static async getStorageByWebsiteId(websiteId: string) {
    return await StorageRepository.getByWebsiteId(db, websiteId);
  }

  static async putObject({
    clientId,
    filename,
    size,
    scope,
    prefix = "",
    expiry = 60,
  }: {
    clientId: string;
    filename: string;
    size: number;
    scope: string;
    prefix?: string;
    expiry?: number;
  }) {
    if (size > 100 * SIZE_1M) {
      throw ApiError.build("ErrConflict");
    }

    const expectedScope = ["storage:create"];
    const storage = await StorageService.verifyStoragePermission(
      clientId,
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
      const fileKey = path.posix.join(prefix, filename);
      const result = await MinioClient.presignedUrl(
        "PUT",
        storage.bucket,
        fileKey,
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

  static async updateStorage(storageId: string, data: TUpdateStorageSchema) {
    return await StorageRepository.update(db, storageId, data);
  }

  static async verifyStoragePermission(
    clientId: string,
    scope: string,
    expectedScope: string[]
  ) {
    let authApp;
    try {
      authApp = await AuthService.init().getAuthAppById(clientId);
    } catch (e) {
      console.error(e);
      throw ApiError.build("ErrUnknown");
    }

    if (!authApp || !authApp.website) {
      throw ApiError.build("ErrNotFound");
    }

    let storage;
    try {
      storage = await this.getStorageByWebsiteId(authApp.website.id);
      if (!storage) {
        throw ApiError.build("ErrNotFound");
      }

      const granted = AuthService.scope.init(authApp.scope);
      const claim = AuthService.scope.init(scope);
      // check if scope is exists
      if (granted.length == 0 || claim.length == 0) {
        throw ApiError.build("ErrForbidden", {
          message: "Insufficient granted permission",
        });
      }

      // check if needed scope(s) is matching
      for (const currScope of expectedScope) {
        if (!granted.get(currScope) || !claim.get(currScope)) {
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
