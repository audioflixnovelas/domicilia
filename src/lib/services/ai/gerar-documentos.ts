import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, BorderStyle } from 'docx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  imagens?: string[];
}

function isAsciiArtLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Limpa delimitadores de código
  if (trimmed.startsWith('```')) return true;
  if (/^\|[\s_]*\\$/i.test(trimmed)) return true;
  if (/^\|[\s_]*\/$/i.test(trimmed)) return true;
  if (/^\/\|$/i.test(trimmed)) return true;
  if (/^\+[-+]+\+$/i.test(trimmed)) return true;
  if (/^\|[\s_]+\|$/i.test(trimmed)) return true;
  if (/^\|[\s_]+\\$/i.test(trimmed)) return true;
  if (/^[\/\\|\s_=-]{3,}$/i.test(trimmed)) return true;
  return false;
}

function cleanText(input: string): string {
  let text = input
    .replace(/Ø=[ÜÝÞª]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/```[a-z]*/g, '');

  // Converte comandos LaTeX em notação matemática comum legível em português
  text = text
    .replace(/\\\(|\\\)/g, '') // remove \( e \)
    .replace(/\\\[|\\\]/g, '') // remove \[ e \]
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 / $2') // \frac{A}{B} -> A / B
    .replace(/\\text\{([^}]+)\}/g, '$1') // \text{palavra} -> palavra
    .replace(/\\sin/g, 'sen')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\theta/g, 'θ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\pi/g, 'π')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/Resposta:\s*___/gi, ''); // remove linhas soltas "Resposta: ___" duplicadas

  return text.trim();
}

function parseAtividade(html: string): { titulo: string; linhas: string[] } {
  const cleaned = cleanText(html);
  const text = cleaned
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

  const rawLinhas = text.split('\n').filter((l) => l.trim());
  const linhas = rawLinhas.filter((l) => !isAsciiArtLine(l));
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

  // Se houver imagens fornecidas pelo professor/pedagogo (data URLs), insere-as no PDF com borda e espaçamento
  if (atividade.imagens && atividade.imagens.length > 0) {
    for (const imgUrl of atividade.imagens) {
      try {
        if (y > 170) {
          doc.addPage();
          y = margin;
        }
        const imgWidth = 135;
        const imgHeight = 80;
        const xPos = (pageWidth - imgWidth) / 2;

        // Moldura em volta da imagem
        doc.setDrawColor(220, 226, 230);
        doc.rect(xPos - 2, y - 2, imgWidth + 4, imgHeight + 4);

        doc.addImage(imgUrl, 'PNG', xPos, y, imgWidth, imgHeight);
        y += imgHeight + 12;
      } catch (err) {
        console.error('Erro ao anexar imagem fornecida pelo professor no PDF:', err);
      }
    }
  }

  // Renderização de tabelas Markdown e linhas de texto
  let inPdfTable = false;
  let pdfTableHead: string[] = [];
  let pdfTableBody: string[][] = [];

  const flushPdfTable = () => {
    if (pdfTableBody.length === 0 && pdfTableHead.length === 0) return;

    autoTable(doc, {
      startY: y,
      head: pdfTableHead.length > 0 ? [pdfTableHead] : undefined,
      body: pdfTableBody,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
    pdfTableHead = [];
    pdfTableBody = [];
    inPdfTable = false;
  };

  doc.setFontSize(11);

  for (const linha of linhas.slice(1)) {
    const isTableRow = linha.trim().startsWith('|') && linha.trim().endsWith('|');

    if (isTableRow) {
      if (linha.includes('---')) continue;

      const cells = linha
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim().replace(/\*\*/g, ''));

      if (!inPdfTable) {
        inPdfTable = true;
        pdfTableHead = cells;
      } else {
        pdfTableBody.push(cells);
      }
      continue;
    } else if (inPdfTable) {
      flushPdfTable();
    }

    const isTitle = linha.startsWith('##') || linha.startsWith('#');
    const text = linha.replace(/^#+\s*/, '').replace(/\*\*/g, '');

    if (isTitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }

    if (y > 270) {
      doc.addPage();
      y = margin;
    }

    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;

    // Adiciona campo de resposta limpo apenas para questões principais sem duplicar
    if (text.includes('?') && !text.toLowerCase().startsWith('resposta:')) {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Resposta: ____________________________________________________', margin, y);
      y += 8;
    }
  }

  if (inPdfTable) {
    flushPdfTable();
  }

  return Buffer.from(doc.output('arraybuffer'));
}
