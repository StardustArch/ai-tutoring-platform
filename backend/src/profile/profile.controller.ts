import { Controller, Post, Body, UseGuards, Request, ValidationPipe, Put } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthGuard } from '@nestjs/passport'; // Importar o AuthGuard
import { CreateProfessorDto } from './dto/create-professor.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// --- PROTEGER TODAS AS ROTAS DESTE MÓDULO ---
@UseGuards(AuthGuard('jwt'))
@Controller('api/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Rota para criar um Perfil de Encarregado
   * POST /api/profile/encarregado
   */
  @Post('encarregado')
  async createEncarregado(
    @Request() req, // 'req' contém o 'user' injectado pelo 'JwtStrategy'
  ) {
    // O 'req.user' foi validado pelo "Guarda"
    const userId = req.user.id;
    return this.profileService.createEncarregadoProfile(userId);
  }

    /**
   * Rota para atualizar o perfil do utilizador
   * PUT /api/user/profile
   */
  @Put()
  async updateProfile(
    @Request() req,
    @Body(new ValidationPipe()) dto: UpdateUserDto,
  ) {
    const userId = req.user.id;
    return this.profileService.updateUserProfile(userId, dto);
  }
}