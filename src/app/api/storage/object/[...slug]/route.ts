import { AuthService } from "@/auth/services/auth.service";
import { StorageService } from "@/storage/services/storage.service";
import { ApiError } from "@/core/lib/error";
import { NextRequest } from "next/server";
import { AuthError } from "@/auth/lib/error";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  if (!slug) {
    return ApiError.build("ErrNotFound").toResponse();
  }

  try {
    const token = await AuthService.init().verifyToken({ req });

    let filename = slug;
    if (Array.isArray(slug)) {
      filename = path.posix.join(...slug);
    }

    const obj = await StorageService.getObject({
      websiteId: token.sub,
      filename,
      scope: token.scope || "",
    });

    return new Response(obj, { status: 200 });
  } catch (e) {
    if (e instanceof ApiError) {
      return e.toResponse();
    }

    if (e instanceof AuthError) {
      return ApiError.build("ErrUnauthorized").toResponse();
    }

    console.error(e);
    return ApiError.build("ErrUnknown").toResponse();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  if (!slug) {
    return ApiError.build("ErrNotFound").toResponse();
  }

  try {
    const token = await AuthService.init().verifyToken({ req });

    let filename = slug;
    if (Array.isArray(slug)) {
      filename = path.posix.join(...slug);
    }

    await StorageService.deleteObject({
      websiteId: token.sub,
      filename,
      scope: token.scope || "",
    });

    return Response.json({ data: { message: "object deleted successfully" } });
  } catch (e) {
    if (e instanceof ApiError) {
      return e.toResponse();
    }

    if (e instanceof AuthError) {
      return ApiError.build("ErrUnauthorized").toResponse();
    }

    console.error(e);
    return ApiError.build("ErrUnknown").toResponse();
  }
}
