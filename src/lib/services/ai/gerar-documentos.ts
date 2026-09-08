import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle } from 'docx';
import jsPDF from 'jspdf';

export interface AtividadeData {
  titulo: string;
  disciplina: string;
  serie: string;
  turma: string;
  aluno: string;
  conteudo: string;
}

function parseAtividade(html: string): { titulo: string; linhas: string[] } {
  // Remove tags HTML basicas
  const text = html
    .replace(/<h[1-6][^>]*>/gi, '\n## ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<strong[^>]*>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  const linhas = text.split('\n').filter((l) => l.trim());
  const titulo = linhas[0]?.replace(/^##\s*/, '') || 'Atividade Domiciliar';

  return { titulo, linhas };
}

export async function gerarDOCX(atividade: AtividadeData): Promise<Buffer> {
  const { titulo, linhas } = parseAtividade(atividade.conteudo);

  const children: (Paragraph | Table)[] = [];

  // Cabecalho
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'ATIVIDADE DOMICILIAR - COLÉGIO MALUF', bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Info
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Disciplina: ${atividade.disciplina}`, size: 22, bold: true }),
        new TextRun({ text: `   |   Série: ${atividade.serie}`, size: 22 }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Turma: ${atividade.turma}`, size: 22 }),
        new TextRun({ text: `   |   Aluno(a): ${atividade.aluno}`, size: 22, bold: true }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Data: ____/____/________`, size: 22 }),
      ],
      spacing: { after: 300 },
    })
  );

  // Processamento de linhas e tabelas Markdown
  let inTable = false;
  let tableRowsData: string[][] = [];

  const flushTable = () => {
    if (tableRowsData.length === 0) return;

    const docxTableRows: TableRow[] = tableRowsData.map((rowCells, rowIndex) => {
      const isHeader = rowIndex === 0;
      return new TableRow({
        children: rowCells.map(
          (cellText) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cellText.trim(),
                      bold: isHeader,
                      size: isHeader ? 22 : 20,
                    }),
                  ],
                }),
              ],
              width: { size: 100 / Math.max(rowCells.length, 1), type: WidthType.PERCENTAGE },
              shading: isHeader ? { fill: 'F3F4F6' } : undefined,
            })
        ),
      });
    });

    children.push(
      new Table({
        rows: docxTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );

    children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    tableRowsData = [];
    inTable = false;
  };

  for (const linha of linhas.slice(1)) {
    const isTableRow = linha.trim().startsWith('|') && linha.trim().endsWith('|');

    if (isTableRow) {
      // Ignora linhas separadoras do tipo |---|---|
      if (linha.includes('---')) continue;

      inTable = true;
      const cells = linha
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim().replace(/\*\*/g, ''));
      tableRowsData.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    const isTitle = linha.startsWith('##');
    const text = linha.replace(/^##\s*/, '').replace(/\*\*/g, '');

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isTitle,
            size: isTitle ? 24 : 22,
          }),
        ],
        spacing: { after: isTitle ? 200 : 100 },
      })
    );

    // Adiciona espaco para resposta se a linha contem "?" ou exercicio numerado
    if (text.includes('?') || text.includes('___')) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Resposta: _______________________________________________', size: 22 })],
          spacing: { after: 200 },
        })
      );
    }
  }

  if (inTable) {
    flushTable();
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export function gerarPDF(atividade: AtividadeData): Buffer {
  const { titulo, linhas } = parseAtividade(atividade.conteudo);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let y = margin;

  // Cabecalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ATIVIDADE DOMICILIAR', pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Disciplina: ${atividade.disciplina}`, margin, y);
  y += 7;
  doc.text(`Turma: ${atividade.turma}`, margin, y);
  y += 7;
  doc.text(`Aluno(a): ${atividade.aluno}`, margin, y);
  y += 7;
  doc.text('Data: ____/____/________', margin, y);
  y += 12;

  // Linha separadora
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Conteudo
  doc.setFontSize(11);
  for (const linha of linhas.slice(1)) {
    const isTitle = linha.startsWith('##');
    const text = linha.replace(/^##\s*/, '').replace(/\*\*/g, '');

    if (isTitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
    }

    // Quebra de pagina
    if (y > 270) {
      doc.addPage();
      y = margin;
    }

    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * 6;

    // Espaco para resposta
    if (text.includes('?') || text.includes('___')) {
      y += 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Resposta: _______________________________________________', margin, y);
      y += 10;
    }

    y += 4;
  }

  return Buffer.from(doc.output('arraybuffer'));
}
