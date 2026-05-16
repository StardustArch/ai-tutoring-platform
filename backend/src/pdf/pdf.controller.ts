import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { PdfService } from './pdf.service';
import express from 'express';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt')) // Aplica proteção a tudo por padrão
@Controller('api/pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) { }

  @Get('student/:studentId/report')
  async gerarRelatorioAluno(
    @Param('studentId') alunoId: string,
    @Query('range') periodo: string,
    @Req() req: any,
  ) {
    const dadosPdf =
      await this.pdfService.getStudentReportForTeacherPdf(
    parseInt(alunoId), // ✅ converte para number
        req.user.id,
        periodo || 'all'
      );
    return dadosPdf;
  }

  @Get('student/:studentId/report/pdf')
async gerarPdfAluno(
  @Param('studentId') alunoId: string,
  @Query('range') periodo: string,
  @Req() req: any,
  @Res() res: express.Response
) {
  const pdfBuffer = await this.pdfService.gerarPdfDoRelatorio(
    parseInt(alunoId),
    req.user.id,
    periodo || 'all'
  );

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="Relatorio_Aluno_${alunoId}.pdf"`,
    'Content-Length': pdfBuffer.length
  });

  res.send(pdfBuffer);
}

}
