import { MinioClient } from "@/core/lib/minio";
import path from "path";
import { StorageRepository } from "../repositories/storage.repository";
import { db } from "@/db";
import { ApiError } from "@/core/lib/error";
import { AuthService } from "@/auth/services/auth.service";
import { SIZE_1M, TUpdateStorageSchema } from "../schema";

export class StorageService {
  static async deleteObject(bucket: string, filename: string, prefix = "") {
    // TODO: implemets deleteObject handler
    const location = path.posix.join(prefix, filename);
    console.log(bucket, location);
  }

  static async getObject(bucket: string, filename: string, prefix = "") {
    // TODO: implements getObject handler
    const location = path.posix.join(prefix, filename);
    console.log(bucket, location);
  }

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
        throw ApiError.build("ErrUnauthorized");
      }

      // check if needed scope is matching
      if (!granted.get("storage:create") || !claim.get("storage:create")) {
        throw ApiError.build("ErrUnauthorized");
      }
    } catch (e) {
      if (e instanceof ApiError) {
        throw e;
      }

      console.error(e);
      throw ApiError.build("ErrUnknown");
    }

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
        { prefix, "content-length": size.toString() }
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
}
