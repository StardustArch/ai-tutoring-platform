
// src/escolas/dto/upload-documento.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class UploadDocumentoEscolaDto {
  @IsString()
  @IsNotEmpty()
  tipo: string; // "alvara" ou "certificado_registro"

  @IsString()
  @IsOptional()
  numeroDocumento?: string;

  @IsDateString()
  @IsOptional()
  dataEmissao?: string;

  @IsDateString()
  @IsOptional()
  dataValidade?: string;
}