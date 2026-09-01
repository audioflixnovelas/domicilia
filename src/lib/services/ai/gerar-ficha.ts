import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';

export interface FichaData {
  professor: string;
  disciplina: string;
  aluno: string;
  turma: string;
  pedagoga: string;
  data: string;
  numAulas: string;
  encaminhamento: string;
  roteiro: string;
  observacoes: string;
}

const b = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
const bords = { top: b, bottom: b, left: b, right: b };

function cell(label: string, value: string, span?: number) {
  return new TableCell({
    width: { size: span ? 5552 : 4753, type: WidthType.DXA },
    borders: bords,
    columnSpan: span,
    children: [
      new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Arial', size: 20 })], spacing: { after: 0, line: 240 } }),
      new Paragraph({ children: [new TextRun({ text: value || '________________', font: 'Arial', size: 20 })], spacing: { after: 0, line: 240 } }),
    ],
  });
}

function empty(n: number) {
  return Array(n).fill(null).map(() => new Paragraph({ children: [], spacing: { after: 0, line: 240 } }));
}

export async function gerarFicha(d: FichaData): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Encaminhamento de conteudo/atividade Domiciliar - 1o TRIMESTRE/2025', bold: true, font: 'Arial', size: 28 })], spacing: { after: 57 }, indent: { right: 288 }, alignment: AlignmentType.BOTH }),
        new Table({
          width: { size: 10305, type: WidthType.DXA },
          rows: [
            new TableRow({ children: [cell('PROFESSOR: ', d.professor), cell('COMPONENTE/DISCIPLINA: ', d.disciplina, 3)] }),
            new TableRow({ children: [cell('ESTUDANTE: ', d.aluno, 2), cell('TURMA: ', d.turma, 2)] }),
            new TableRow({ children: [cell('PEDAGOGA RESP.: ', d.pedagoga, 2), cell('QUINZENA/DATA: ', d.data, 2)] }),
            new TableRow({ children: [cell('MES: ', d.data), cell('FICHA 1:', ''), cell('NO DE AULAS:', d.numAulas)] }),
          ],
        }),
        new Paragraph({ children: [], spacing: { after: 0, line: 240 } }),
        new Paragraph({ children: [new TextRun({ text: 'ENCAMINHAMENTO:', font: 'Arial', size: 28 })], spacing: { after: 0, line: 240 }, alignment: AlignmentType.BOTH }),
        new Table({
          width: { size: 10230, type: WidthType.DXA },
          rows: [
            new TableRow({ children: [new TableCell({ width: { size: 10230, type: WidthType.DXA }, borders: { top: b, bottom: b, left: b, right: b }, children: [new Paragraph({ children: [new TextRun({ text: 'ROTEIRO DE ESTUDOS', bold: true, font: 'Arial', size: 28 })], spacing: { after: 0 }, indent: { left: 141 } }), ...empty(18)] })] }),
            new TableRow({ children: [new TableCell({ width: { size: 10230, type: WidthType.DXA }, borders: { top: b, bottom: b, left: b, right: b }, children: [new Paragraph({ children: [new TextRun({ text: 'OBSERVACOES:', font: 'Arial', size: 20 })], spacing: { after: 0 } }), ...empty(4)] })] }),
          ],
        }),
        new Paragraph({ children: [], spacing: { after: 0, line: 240 } }),
        new Paragraph({ children: [new TextRun({ text: 'DESENVOLVER A ATIVIDADE (TRABALHO/PROVA) NA SEQUENCIA OU ENVIAR AS MESMAS EM ANEXO.', font: 'Arial', size: 28, italics: true })], alignment: AlignmentType.BOTH }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
