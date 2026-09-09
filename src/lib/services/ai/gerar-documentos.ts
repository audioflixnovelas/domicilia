import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, BorderStyle } from 'docx';
import jsPDF from 'jspdf';

// SVG Diagrama do Triângulo Retângulo
function generateRightTriangleSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <polygon points="50,160 250,160 50,40" fill="#e0f2fe" stroke="#1d4ed8" stroke-width="3"/>
    <!-- Ângulo Reto -->
    <rect x="50" y="140" width="20" height="20" fill="none" stroke="#1d4ed8" stroke-width="2"/>
    <circle cx="60" cy="150" r="2.5" fill="#1d4ed8"/>
    <!-- Rótulos -->
    <text x="35" y="165" font-family="Arial" font-size="14" font-weight="bold" fill="#0f172a">A</text>
    <text x="260" y="165" font-family="Arial" font-size="14" font-weight="bold" fill="#0f172a">B</text>
    <text x="35" y="35" font-family="Arial" font-size="14" font-weight="bold" fill="#0f172a">C</text>
    <!-- Lados -->
    <text x="145" y="180" font-family="Arial" font-size="13" font-weight="bold" fill="#0284c7">Cateto b</text>
    <text x="15" y="105" font-family="Arial" font-size="13" font-weight="bold" fill="#0284c7">Cateto c</text>
    <text x="155" y="90" font-family="Arial" font-size="13" font-weight="bold" fill="#b91c1c">Hipotenusa a</text>
  </svg>`;
}

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
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ATIVIDADE DOMICILIAR - COLÉGIO MALUF', pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Disciplina: ${atividade.disciplina} | Série: ${atividade.serie}`, margin, y);
  y += 6;
  doc.text(`Turma: ${atividade.turma} | Aluno(a): ${atividade.aluno}`, margin, y);
  y += 6;
  doc.text('Data: ____/____/________', margin, y);
  y += 10;

  // Linha separadora
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Se o conteúdo tratar de geometria / triângulo retângulo, insere o diagrama geométrico
  const isGeometry = atividade.conteudo.toLowerCase().includes('triângulo') ||
                     atividade.conteudo.toLowerCase().includes('cateto') ||
                     atividade.conteudo.toLowerCase().includes('hipotenusa') ||
                     atividade.disciplina.toLowerCase().includes('geometria') ||
                     atividade.disciplina.toLowerCase().includes('matemática');

  if (isGeometry) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 180);
        // Desenha Triângulo Retângulo
        ctx.beginPath();
        ctx.moveTo(50, 150);
        ctx.lineTo(250, 150);
        ctx.lineTo(50, 30);
        ctx.closePath();
        ctx.fillStyle = '#e0f2fe';
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Ângulo reto
        ctx.strokeRect(50, 130, 20, 20);

        // Textos
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px Arial';
        ctx.fillText('C (90°)', 25, 155);
        ctx.fillText('B', 255, 155);
        ctx.fillText('A', 45, 20);

        ctx.fillStyle = '#0284c7';
        ctx.fillText('Cateto b (base)', 115, 170);
        ctx.fillText('Cateto c (altura)', 10, 95);
        ctx.fillStyle = '#b91c1c';
        ctx.fillText('Hipotenusa a', 150, 85);

        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', (pageWidth - 100) / 2, y, 100, 60);
        y += 65;
      }
    } catch {
      // Ignora se estiver rodando em ambiente SSR headless puro sem Canvas
    }
  }

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
