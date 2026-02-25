import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // O AuthGuard('jwt') já deve ter colocado o user aqui

    // 1. Se não houver utilizador (não passou no AuthGuard ou token inválido)
    if (!user) {
      throw new UnauthorizedException('Utilizador não autenticado');
    }

    // 2. A verificação CRÍTICA: É Admin?
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado: Apenas administradores podem aceder a esta área.');
    }

    return true;
  }
}