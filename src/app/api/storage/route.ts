import { AuthService } from "@/auth/services/auth.service";
import { PutObjectSchema } from "@/storage/schema";
import { StorageService } from "@/storage/services/storage.service";
import { ApiError } from "@/core/lib/error";
import { NextRequest } from "next/server";
import { AuthError } from "@/auth/lib/error";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error(e);
    return ApiError.build("ErrValidation").toResponse();
  }

  try {
    const token = await AuthService.init().verifyToken({ req });

    const input = PutObjectSchema.safeParse(body);
    if (!input.success) {
      return ApiError.build("ErrValidation", { cause: input.error });
    }

    const presignedUrl = await StorageService.putObject({
      clientId: token.sub,
      filename: input.data.filename,
      size: input.data.size,
      scope: token.scope || "",
    });

    return Response.json(
      { data: { presignedUrl } },
      {
        headers: [
          ["Cache-Control", "no-store"],
          ["Pragma", "no-cache"],
        ],
      }
    );
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
