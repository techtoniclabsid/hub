import { ZodError } from "zod";

export const enum EErrorCode {
  ErrNotFound = "404:data not found",
  ErrUnauthorized = "401:sign in to continue",
  ErrUnknown = "500:unknown error occurred",
  ErrValidation = "400:error in parsing input data",
  ErrForbidden = "403:request forbidden",
  ErrConflict = "409:request conflict",
  ErrTooManyRequest = "425:too many request",
}

export type TErrorCode = keyof typeof EErrorCode;

export type TApiErrorParam = {
  status?: number;
  message?: string;
  error?: unknown;
  code?: TErrorCode;
};

export class ApiError {
  private _cause: unknown;
  private _message?: string;
  private _code?: string;
  private _status?: number;

  constructor(param: TApiErrorParam) {
    if (param.code) {
      const { status, message } = this.parseErrorCodeString(param.code);
      this._status = status;
      this._code = param.code;
      this._message = message;
    }

    if (param.message) {
      this._message = param.message;
    }

    if (param.status) {
      this._status = param.status;
    }

    if (param.error) {
      if (param.error instanceof ZodError) {
        this._cause = param.error.flatten();
      }
    }
  }

  parseErrorCodeString(code: TErrorCode) {
    const split = code.split(":");
    const parsed = {
      status: parseInt(split[0]),
      message: split[1],
    };

    return parsed;
  }

  static build(param: TApiErrorParam) {
    return new ApiError(param);
  }

  toResponse() {
    return Response.json(
      {
        error: {
          code: this._code,
          message: this._message,
          cause: this._cause,
        },
      },
      { status: this._status }
    );
  }

  get cause() {
    return this._cause;
  }

  get message() {
    return this._message;
  }

  get status() {
    return this._status;
  }
}
