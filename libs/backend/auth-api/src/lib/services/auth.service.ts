import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  login() {
    return { logged: true };
  }

  register() {
    return { logged: true };
  }

  logout() {
    return { logged: false };
  }

  refresh() {
    return { logged: true };
  }
}
