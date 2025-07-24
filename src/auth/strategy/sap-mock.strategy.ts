import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
// import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ParsedQs } from 'qs';

@Injectable()
export class SAPMockStrategy extends PassportStrategy(Strategy, 'sap-mock') {
  constructor(private configService: ConfigService) {
    super();
  }

  authenticate(
    req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
    options?: any,
  ): void {
    const { fromUser, reconnect } = req.query;
    const state = fromUser ? JSON.stringify({ fromUser, reconnect }) : undefined;
    super.authenticate(req, { ...options, state });
  }

  async validate(req: Request, done: Function) {
    try {
      const tokenUrl = this.configService.get<string>('SAP_MOCK_URL_TOKEN');
      const clientId = this.configService.get<string>('SAP_MOCK_CLIENT_ID');
      const clientSecret = this.configService.get<string>('SAP_MOCK_CLIENT_SECRET');

      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);

      const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const accessToken = response.data.access_token;
      done(null, { accessToken });
    } catch (err) {
      done(err, null);
    }
  }
}

// @Injectable()
// export class SAPMockStrategy extends PassportStrategy(Strategy, 'sap-mock') {
//   constructor(private readonly configService: ConfigService) {
//     super({
//       authorizationURL: configService.get<string>('SAP_MOCK_URL_AUTH'),
//       tokenURL: configService.get<string>('SAP_MOCK_URL_TOKEN'),
//       clientID: configService.get<string>('SAP_MOCK_CLIENT_ID'),
//       clientSecret: configService.get<string>('SAP_MOCK_CLIENT_SECRET'),
//       callbackURL: configService.get<string>('SAP_MOCK_CALLBACK_URL'),
//       state: false,
//     });
//   }

//   async validate(
//     accessToken: string,
//     refreshToken: string,
//     profile: any,
//     done: Function,
//   ): Promise<any> {
//     if (!accessToken) {
//       return done(new UnauthorizedException(), false);
//     }
//     console.log('Access Token:', accessToken);
//   }
// }
