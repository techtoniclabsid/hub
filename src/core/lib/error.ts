import { ZodError } from "zod";

export enum EErrorCode {
  ErrValidation = "400:error in parsing input data",
  ErrUnauthorized = "401:sign in to continue",
  ErrForbidden = "403:request forbidden",
  ErrNotFound = "404:data not found",
  ErrConflict = "409:request conflict",
  ErrTooManyRequests = "425:too many requests",
  ErrUnknown = "500:unknown error occurred",
}

export type TErrorCode = keyof typeof EErrorCode;

export type TApiErrorParam =
  | {
      message: string;
      status?: number;
      error?: unknown;
      code?: TErrorCode;
    }
  | {
      code: TErrorCode;
      message?: string;
      status?: number;
      error?: unknown;
    };

export class ApiError extends Error {
  code?: TErrorCode;
  status?: number;
  cause?: unknown;

  constructor(param: TApiErrorParam) {
    super(param.message);
    this.name = this.constructor.name;

    if (param.code) {
      const { status, message } = this.parseErrorCodeString(param.code);
      this.status = status;
      this.code = param.code;
      if (!param.message) {
        this.message = message;
      }
    }

    if (param.status) {
      this.status = param.status;
    }

    if (param.error) {
      if (param.error instanceof ZodError) {
        this.cause = param.error.flatten();
      }
    }
  }

  parseErrorCodeString(code: TErrorCode) {
    const split = EErrorCode[code].split(":");
    const parsed = {
      status: parseInt(split[0]),
      message: split[1],
    };

    return parsed;
  }

  static build(param: TApiErrorParam) {
    return new ApiError(param);
  }

  toObject() {
    return {
      code: this.code,
      message: this.message,
      cause: this.cause,
      status: this.status,
    };
  }

  toResponse() {
    return Response.json(
      {
        error: {
          code: this.code,
          message: this.message,
          cause: this.cause,
        },
      },
      { status: this.status }
    );
  }
}
