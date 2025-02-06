import { ApiError } from "@/core/lib/error";
import { AuthService } from "@/auth/services/auth.service";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const payload = await AuthService.init().verifyToken({ req });

    return Response.json({ payload });
  } catch (e) {
    if (e instanceof ApiError) {
      return e.toResponse();
    }
    return ApiError.build("ErrUnknown").toResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { accessToken, tokenType, expiresIn, scope } =
      await AuthService.init().requestToken({ req });

    return Response.json(
      {
        access_token: accessToken,
        token_type: tokenType,
        expires_in: expiresIn,
        scope,
      },
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
    return ApiError.build("ErrUnknown").toResponse();
  }
}
