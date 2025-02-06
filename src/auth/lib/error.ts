export enum EAuthErrorCode {
  ErrAuthInvalidRequest = "400:invalid_request:Request is missing required parameter",
  ErrAuthInvalidClient = "401:invalid_client:Client id or secret is invalid",
  ErrAuthInvalidGrant = "400:invalid_grant:Grant is invalid or expired",
  ErrAuthInvalidScope = "400:invalid_scope:Scope value is invalid",
  ErrAuthUnauthorizedClient = "401:uauthorized_client:Client is not authorized to use the requested grant type",
  ErrAuthUnsupportedGrantType = "400:unsupported_grant_type:Grant type is not supported",
  ErrAuthIncorrectAuthType = "400:invalid_grant:Incorrect auth type",
  ErrAuthDisabled = "401:invalid_grant:Client credentials is disabled",
  ErrAuthMismatch = "401:invalid_client:Client credentials is mismatch",
  ErrAuthInvalidToken = "400:invalid_request:Token is malformed or expired",
  ErrAuthUnknown = "500:server_error:Unknown server error",
}

export type TAuthErrorCode = keyof typeof EAuthErrorCode;

export type TAuthErrorParams = {
  code: TAuthErrorCode;
  message?: string;
  status?: number;
};

export type TAuthErrorOptionalsParams = {
  message?: string;
  status?: number;
};

export class AuthError extends Error {
  error: string;
  code?: TAuthErrorCode;
  status?: number;

  constructor(param: TAuthErrorParams) {
    super(param.message);
    this.name = this.constructor.name;
    const { status, error, error_description } = AuthError.parseAuthErrorCode(
      param.code
    );
    this.code = param.code;
    this.status = param.status || status;
    this.error = error;
    this.message = param.message || error_description;
  }

  static parseAuthErrorCode(code: TAuthErrorCode) {
    const split = EAuthErrorCode[code].split(":");
    const parsed = {
      status: parseInt(split[0]),
      error: split[1],
      error_description: split[2],
    };

    return parsed;
  }

  static build(param: TAuthErrorCode, config?: TAuthErrorParams) {
    return new AuthError({ code: param, ...config });
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
        error: this.error,
        error_description: this.message,
      },
      {
        status: this.status,
        headers: [
          ["Cache-Control", "no-store"],
          ["Pragma", "no-cache"],
        ],
      }
    );
  }
}
