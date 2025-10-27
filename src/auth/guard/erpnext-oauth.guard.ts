import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ErpNextOAuthGuard extends AuthGuard('erpnext-oauth') {}
