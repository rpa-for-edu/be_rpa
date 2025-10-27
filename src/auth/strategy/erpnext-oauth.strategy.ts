import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ErpNextOAuthStrategy extends PassportStrategy(Strategy, 'erpnext-oauth') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async validate(req: Request, done: Function) {
    try {
      const ERP_BASE_URL = this.config.get<string>('ERP_BASE_URL');
      const ERP_CLIENT_ID = this.config.get<string>('ERP_CLIENT_ID');
      const ERP_CLIENT_SECRET = this.config.get<string>('ERP_CLIENT_SECRET');
      const ERP_REDIRECT_URI = this.config.get<string>('ERP_REDIRECT_URI');

      const { code } = req.query;

      // ⚡ Nếu chưa có code → redirect tới ERPNext authorize
      if (!code) {
        const state = encodeURIComponent(
          JSON.stringify({
            fromUser: true,
            reconnect: false,
          }),
        );

        const params = new URLSearchParams({
          client_id: ERP_CLIENT_ID,
          response_type: 'code',
          scope: 'all openid',
          redirect_uri: ERP_REDIRECT_URI,
          state,
        });

        const authorizeUrl = `${ERP_BASE_URL}/api/method/frappe.integrations.oauth2.authorize?${params.toString()}`;
        (req.res as any).redirect(authorizeUrl);
        return;
      }

      // ⚙️ Nếu có code → đổi code lấy token
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        client_id: ERP_CLIENT_ID,
        client_secret: ERP_CLIENT_SECRET,
        redirect_uri: ERP_REDIRECT_URI,
      });

      const tokenRes = await axios.post(
        `${ERP_BASE_URL}/api/method/frappe.integrations.oauth2.get_token`,
        tokenParams,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const { access_token, refresh_token } = tokenRes.data;

      done(null, {
        accessToken: access_token,
        refreshToken: refresh_token,
        profile: {}, // ERPNext không trả userinfo, cần gọi thêm nếu muốn
      });
    } catch (err) {
      console.error('ERPNext OAuth2 error:', err.response?.data || err);
      done(err, null);
    }
  }
}
