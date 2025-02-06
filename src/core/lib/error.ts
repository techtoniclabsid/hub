import { ZodError } from "zod";

export enum EErrorCode {
  // general error
  ErrValidation = "400:Error in parsing input data",
  ErrUnauthorized = "401:Authorization needed",
  ErrForbidden = "403:Request forbidden",
  ErrNotFound = "404:Data not found",
  ErrConflict = "409:Request conflict",
  ErrTooManyRequests = "425:Too many requests",
  ErrUnknown = "500:Unknown error occurred",
}

export type TErrorCode = keyof typeof EErrorCode;

export type TApiErrorParams = {
  message: string;
  status?: number;
  cause?: unknown;
  code?: TErrorCode;
};

export type TApiErrorOptionalsParams = {
  message?: string;
  status?: number;
  cause?: unknown;
  code?: TErrorCode;
};

export class ApiError extends Error {
  code?: TErrorCode;
  status?: number;
  cause?: unknown;

  constructor(param: TApiErrorParams) {
    super(param.message);
    this.name = this.constructor.name;

    if (param.code) {
      const { status, message } = ApiError.parseErrorCode(param.code);
      this.status = status;
      this.code = param.code;
      if (!param.message) {
        this.message = message;
      }
    }

    if (param.status) {
      this.status = param.status;
    }

    if (param.cause) {
      if (param.cause instanceof ZodError) {
        this.cause = param.cause.flatten();
      } else {
        this.cause = param.cause;
      }
    }
  }

  static parseErrorCode(code: TErrorCode) {
    const split = EErrorCode[code].split(":");
    const parsed = {
      status: parseInt(split[0]),
      message: split[1],
    };

    return parsed;
  }

  static build(code: TErrorCode, params?: TApiErrorOptionalsParams): ApiError;
  static build(params: TApiErrorParams): ApiError;
  static build(param: TErrorCode | TApiErrorParams, config?: TApiErrorParams) {
    if (typeof param === "string") {
      const { status, message } = ApiError.parseErrorCode(param);
      return new ApiError({ code: param, status, message, ...config });
    }
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
