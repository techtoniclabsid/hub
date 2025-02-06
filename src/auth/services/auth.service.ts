import { NextRequest } from "next/server";
import { GrantTypesSchema } from "../schema";
import { AuthRepository } from "../repositories/auth.repository";
import { db } from "@/db";
import { createId } from "@paralleldrive/cuid2";
import { sign, verify } from "jsonwebtoken";
import { AuthError } from "../lib/error";

export type TAuthConfig = {
  issuer?: string;
  secret?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  jtiFn?: () => string;
};

export type TRequestTokenParams = {
  req: NextRequest;
};

export type TRequestTokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  scope?: string | null;
};

export type TGenerateTokenParams = {
  subject: string;
  scope?: string | null;
  audience?: string | null;
};

export interface TAuthBasic {
  authType: "Basic";
  clientId: string;
  clientSecret: string;
}

export interface TAuthBearer {
  authType: "Bearer";
  token: string;
}

export type TAuthHeader = TAuthBasic | TAuthBearer;

export type TVerifyTokenParams = {
  req: NextRequest;
};

export class AuthService {
  private _issuer = process.env.HUB_URL;
  private _secret = process.env.HUB_SECRET as string;
  private _expiresIn = 30 * 60; // access token expires in 30 minutes
  private _refreshExpiresIn = 24 * 60 * 60; // refresh token expires in a day
  private _jtiFn = () => createId();

  constructor(config?: TAuthConfig) {
    if (config) {
      this._secret = config.secret || this._secret;
      this._expiresIn = config.expiresIn || this._expiresIn;
      this._refreshExpiresIn =
        config.refreshExpiresIn || this._refreshExpiresIn;
      this._issuer = config.issuer || this._issuer;
      if (config.jtiFn) {
        this._jtiFn = config.jtiFn;
      }
    }
  }

  private generateToken({ subject, scope, audience }: TGenerateTokenParams) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      iss: this._issuer,
      sub: subject,
      jti: this._jtiFn(),
    };

    if (scope) {
      payload.scope = scope;
    }

    if (audience) {
      payload.aud = audience;
    }

    const accessToken = sign(payload, this._secret, {
      expiresIn: this._expiresIn,
    });

    return { accessToken };
  }

  getAuthHeader(headers: Headers): TAuthHeader {
    const authHeader = headers.get("Authorization");
    if (!authHeader) {
      throw AuthError.build("ErrAuthInvalidGrant");
    }

    const split = authHeader.split(" ");
    if (split.length != 2) {
      throw AuthError.build("ErrAuthInvalidGrant");
    }

    switch (split[0]) {
      case "Basic":
        const decoded = atob(split[1]);
        const payload = decoded.split(":");
        if (payload.length != 2) {
          throw AuthError.build("ErrAuthInvalidGrant");
        }
        return {
          authType: "Basic",
          clientId: payload[0],
          clientSecret: payload[1],
        };
      case "Bearer":
        return {
          authType: "Bearer",
          token: split[1],
        };
      default:
        throw AuthError.build("ErrAuthInvalidGrant");
    }
  }

  async getClientById(clientId: string) {
    return await AuthRepository.getById(db, clientId);
  }

  static parseRequest(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const headers = req.headers;
    const cookies = req.cookies;
    return { searchParams, headers, cookies };
  }

  async requestToken({
    req,
  }: TRequestTokenParams): Promise<TRequestTokenResponse> {
    const { headers, searchParams } = AuthService.parseRequest(req);
    const grantType = searchParams.get("grant_type");

    if (!grantType) {
      throw AuthError.build("ErrAuthInvalidRequest");
    }

    const pGrantType = GrantTypesSchema.safeParse(grantType);
    if (!pGrantType.success) {
      throw AuthError.build("ErrAuthUnsupportedGrantType");
    }

    const auth = this.getAuthHeader(headers);
    switch (pGrantType.data) {
      case "client_credentials":
        let client;
        try {
          client = await this.verifyBasicAuth(auth);
        } catch (e) {
          if (e instanceof AuthError) {
            if (e.code === "ErrAuthIncorrectAuthType") {
              throw e;
            }
            throw AuthError.build("ErrAuthInvalidClient");
          }
          throw AuthError.build("ErrAuthUnknown");
        }

        const token = this.generateToken({
          subject: client.clientId,
          scope: client.scope,
        });

        return {
          accessToken: token.accessToken,
          tokenType: "Bearer",
          expiresIn: this._expiresIn,
          scope: client.scope,
        };
      default:
        throw AuthError.build("ErrAuthUnsupportedGrantType");
    }
  }

  static init(config?: TAuthConfig) {
    return new AuthService(config);
  }

  async verifyBasicAuth(header: TAuthHeader) {
    // check for auth type
    if (header.authType != "Basic") {
      throw AuthError.build("ErrAuthIncorrectAuthType");
    }

    const client = await AuthRepository.getById(db, header.clientId);
    if (!client) {
      throw AuthError.build("ErrAuthInvalidClient");
    }

    // check if auth client is disabled
    if (client.disabled) {
      throw AuthError.build("ErrAuthDisabled");
    }

    // check if clientId and clientSecret matched
    if (
      header.clientId != client.clientId ||
      header.clientSecret != client.clientSecret
    ) {
      throw AuthError.build("ErrAuthMismatch");
    }

    // omit clientSecret
    client.clientSecret = "";

    return client;
  }

  async verifyAccessToken(token: string) {
    let payload;
    try {
      payload = verify(token, this._secret);
      if (typeof payload === "string" || !payload.sub || !payload.jti) {
        throw AuthError.build("ErrAuthInvalidToken");
      }

      // check for blacklisted sub
      // const newIat = await RedisClient.get(payload.sub);
      // if (newIat) {
      //   if (
      //     !payload.iat ||
      //     typeof newIat != "string" ||
      //     payload.iat < parseInt(newIat)
      //   ) {
      //     console.debug("newer iat required");
      //     throw AuthError.build("ErrAuthInvalidToken");
      //   }
      // }

      // check for blacklisted jti
      // const blockedJti = await RedisClient.get(payload.jti);
      // if (blockedJti) {
      //   console.debug("jti is blocked", payload.jti);
      //   throw AuthError.build("ErrAuthInvalidToken");
      // }
    } catch (e) {
      if (e instanceof AuthError) {
        throw e;
      }
      if (e instanceof Error) {
        if (e.message === "jwt expired") {
          throw AuthError.build("ErrAuthInvalidToken");
        }
      }
      throw AuthError.build("ErrAuthUnknown");
    }

    return payload;
  }

  async verifyToken({ req }: TVerifyTokenParams) {
    const { headers } = AuthService.parseRequest(req);
    const authHeader = this.getAuthHeader(headers);

    try {
      // check for auth type
      switch (authHeader.authType) {
        case "Bearer":
          return await this.verifyAccessToken(authHeader.token);
        default:
          throw AuthError.build("ErrAuthIncorrectAuthType");
      }
    } catch (e) {
      if (e instanceof AuthError) {
        if (e.code === "ErrAuthInvalidToken") {
          throw e;
        } else if (e.code === "ErrAuthIncorrectAuthType") {
          throw e;
        }
        throw AuthError.build("ErrAuthInvalidClient");
      }
      throw AuthError.build("ErrAuthUnknown");
    }
  }
}
