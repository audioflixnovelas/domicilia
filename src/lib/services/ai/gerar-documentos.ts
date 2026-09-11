import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, BorderStyle } from 'docx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper em Canvas/Node para desenhar um diagrama geométrico completo do Triângulo Retângulo com Altura e Projeções (m e n) em formato Data URL PNG
export function generateRightTriangleDataUrl(): string {
  // SVG de vetor em ultra resolução do Triângulo Retângulo com catetos, hipotenusa, altura h e projeções m e n
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <!-- Fundo suave -->
    <rect x="20" y="20" width="560" height="340" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>

    <!-- Triângulo Retângulo ABC (Vértice A no topo = ângulo reto) -->
    <!-- C (50, 280), B (550, 280), A (210, 80) -->
    <polygon points="50,280 550,280 210,80" fill="#eff6ff" stroke="#1d4ed8" stroke-width="3"/>

    <!-- Altura h perpendicular de A (210,80) até H (210, 280) -->
    <line x1="210" y1="80" x2="210" y2="280" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6,4"/>

    <!-- Ângulo reto em A -->
    <polygon points="210,80 197,94 211,108 225,94" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.5"/>
    <circle cx="210" cy="94" r="2.5" fill="#1d4ed8"/>

    <!-- Ângulo reto em H (base da altura) -->
    <rect x="195" y="265" width="15" height="15" fill="#fee2e2" stroke="#dc2626" stroke-width="1.5"/>
    <circle cx="202.5" cy="272.5" r="2" fill="#dc2626"/>

    <!-- Vértices -->
    <circle cx="210" cy="80" r="5" fill="#1e40af"/>
    <text x="202" y="60" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1e40af">A (Ângulo Reto)</text>

    <circle cx="50" cy="280" r="5" fill="#1e40af"/>
    <text x="25" y="300" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1e40af">C</text>

    <circle cx="550" cy="280" r="5" fill="#1e40af"/>
    <text x="560" y="300" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1e40af">B</text>

    <circle cx="210" cy="280" r="4" fill="#dc2626"/>
    <text x="202" y="305" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#dc2626">H</text>

    <!-- Rótulos dos Lados -->
    <!-- Cateto b (AC) -->
    <text x="105" y="170" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#2563eb">cateto b</text>

    <!-- Cateto c (AB) -->
    <text x="390" y="170" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#2563eb">cateto c</text>

    <!-- Altura h -->
    <text x="220" y="185" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#dc2626">altura h</text>

    <!-- Base Hipotenusa a (BC) -->
    <line x1="50" y1="330" x2="550" y2="330" stroke="#059669" stroke-width="2"/>
    <polygon points="50,330 60,325 60,335" fill="#059669"/>
    <polygon points="550,330 540,325 540,335" fill="#059669"/>
    <text x="240" y="350" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#059669">Hipotenusa a (a = m + n)</text>

    <!-- Projeções m e n -->
    <!-- Projeção m (CH) -->
    <line x1="50" y1="310" x2="210" y2="310" stroke="#7c3aed" stroke-width="1.8"/>
    <text x="110" y="305" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#7c3aed">projeção m</text>

    <!-- Projeção n (HB) -->
    <line x1="210" y1="310" x2="550" y2="310" stroke="#7c3aed" stroke-width="1.8"/>
    <text x="360" y="305" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#7c3aed">projeção n</text>
  </svg>`;

  const base64Svg = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
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

  // Se for Matemática/Geometria ou se contiver menção a triângulo retângulo/figura, injeta automaticamente o diagrama vetorial
  const ehGeometria =
    atividade.disciplina.toLowerCase().includes('matemática') ||
    atividade.disciplina.toLowerCase().includes('geometria') ||
    atividade.conteudo.toLowerCase().includes('triângulo') ||
    atividade.conteudo.toLowerCase().includes('[figura:');

  const listaImagens: string[] = atividade.imagens ? [...atividade.imagens] : [];
  if (ehGeometria && listaImagens.length === 0) {
    listaImagens.push(generateRightTriangleDataUrl());
  }

  // Renderiza imagens no PDF com borda elegante e alinhamento centralizado
  if (listaImagens.length > 0) {
    for (const imgUrl of listaImagens) {
      try {
        if (y > 170) {
          doc.addPage();
          y = margin;
        }
        const imgWidth = 145;
        const imgHeight = 90;
        const xPos = (pageWidth - imgWidth) / 2;

        // Moldura em volta da imagem
        doc.setDrawColor(220, 226, 230);
        doc.rect(xPos - 2, y - 2, imgWidth + 4, imgHeight + 4);

        const format = imgUrl.includes('data:image/svg+xml') ? 'SVG' : 'PNG';
        doc.addImage(imgUrl, format as any, xPos, y, imgWidth, imgHeight);
        y += imgHeight + 12;
      } catch (err) {
        console.error('Erro ao anexar imagem fornecida no PDF:', err);
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
