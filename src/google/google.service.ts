import { Injectable } from '@nestjs/common';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleService {
  constructor(readonly configService: ConfigService) {}

  getOAuth2Client(provider: AuthorizationProvider): OAuth2Client {
    let clientId: string;
    let clientSecret: string;
    let callbackUrl: string;

    switch (provider) {
      case AuthorizationProvider.G_DRIVE:
        clientId = this.configService.get('GOOGLE_DRIVE_CLIENT_ID');
        clientSecret = this.configService.get('GOOGLE_DRIVE_CLIENT_SECRET');
        callbackUrl = this.configService.get('GOOGLE_DRIVE_CALLBACK_URL');
        break;
      case AuthorizationProvider.G_SHEETS:
        clientId = this.configService.get('GOOGLE_SHEETS_CLIENT_ID');
        clientSecret = this.configService.get('GOOGLE_SHEETS_CLIENT_SECRET');
        callbackUrl = this.configService.get('GOOGLE_SHEETS_CALLBACK_URL');
        break;
      case AuthorizationProvider.G_GMAIL:
        clientId = this.configService.get('GMAIL_CLIENT_ID');
        clientSecret = this.configService.get('GMAIL_CLIENT_SECRET');
        callbackUrl = this.configService.get('GMAIL_CALLBACK_URL');
        break;
      case AuthorizationProvider.G_CLASSROOM:
        clientId = this.configService.get('GOOGLE_CLASSROOM_CLIENT_ID');
        clientSecret = this.configService.get('GOOGLE_CLASSROOM_CLIENT_SECRET');
        callbackUrl = this.configService.get('GOOGLE_CLASSROOM_CALLBACK_URL');
        break;
      case AuthorizationProvider.G_FORMS:
        clientId = this.configService.get('GOOGLE_FORMS_CLIENT_ID');
        clientSecret = this.configService.get('GOOGLE_FORMS_CLIENT_SECRET');
        callbackUrl = this.configService.get('GOOGLE_FORMS_CALLBACK_URL');
        break;
      default:
        throw new Error(`Provider ${provider} not supported for OAuth2`);
    }

    return new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
  }
}
  