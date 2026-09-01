import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';

export const runtime = 'nodejs';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const dados = await request.json();

    const templatePath = join(process.cwd(), 'ficha.docx');
    const templateBuffer = readFileSync(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);

    // Remove fontes
    Object.keys(zip.files).filter(f => f.startsWith('word/fonts/')).forEach(f => zip.remove(f));

    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) throw new Error('Template invalido');
    let xml = await xmlFile.async('string');

    // Remove paginas 2-5
    const idx = xml.indexOf('Encaminhamento de conte', xml.indexOf('Encaminhamento de conte') + 1);
    if (idx > 0) xml = xml.substring(0, xml.lastIndexOf('<w:p', idx)) + '</w:body></w:document>';

    // Substitui fontes
    xml = xml.replace(/w:ascii="[^"]*"/g, 'w:ascii="Arial"');
    xml = xml.replace(/w:cs="[^"]*"/g, 'w:cs="Arial"');
    xml = xml.replace(/w:eastAsia="[^"]*"/g, 'w:eastAsia="Arial"');
    xml = xml.replace(/w:hAnsi="[^"]*"/g, 'w:hAnsi="Arial"');

    // Substitui textos diretamente nos <w:t>
    xml = xml.replace(/>PROFESSOR: <\//g, `>PROFESSOR: ${dados.professor}</`);
    xml = xml.replace(/>COMPONENTE\/DISCIPLINA: <\//g, `>COMPONENTE/DISCIPLINA: ${dados.disciplina}</`);
    xml = xml.replace(/>ESTUDANTE: <\//g, `>ESTUDANTE: ${dados.aluno}</`);
    xml = xml.replace(/>TURMA: <\//g, `>TURMA: ${dados.turma}</`);
    xml = xml.replace(/>PEDAGOGA RESP.<\//g, `>PEDAGOGA RESP.: ${dados.pedagoga}</`);
    xml = xml.replace(/>QUINZENA\/DATA: <\//g, `>QUINZENA/DATA: ${dados.data}</`);
    xml = xml.replace(/>MÊS:<\//g, `>MES: ${dados.data}</`);
    xml = xml.replace(/>Nº DE AULAS:<\//g, `>NO DE AULAS: ${dados.numAulas}</`);

    // Remove valor antigo do QUINZENA/DATA se existir
    xml = xml.replace(/>05\/02\/2026  a  27\/02\/2026 - <\//g, `>${dados.data}</`);

    // Substitui "FICHA 1:" por "FICHA X:"
    xml = xml.replace(/>FICHA 1:<\//g, `>FICHA ${dados.quinzena || '1'}:</`);

    // Substitui "2º TRIMESTRE/" por "Xº TRIMESTRE/20YY"
    const targetString = 'Encaminhamento de conteúdo/atividade Domiciliar - </w:t></w:r><w:r w:rsidR="00894BE8"><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>2</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>º TRIMESTRE/</w:t>';
    const replacementString = `Encaminhamento de conteúdo/atividade Domiciliar - </w:t></w:r><w:r w:rsidR="00894BE8"><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>${dados.trimestre || '1'}</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>º TRIMESTRE/${dados.anoLetivo || '2026'}</w:t>`;
    xml = xml.replace(targetString, replacementString);

    // Substitui "ROTEIRO DE ESTUDOS" parágrafos vazios
    const roteiroHeader = 'ROTEIRO DE ESTUDOS</w:t></w:r></w:p>';
    const roteiroIdx = xml.indexOf(roteiroHeader);
    if (roteiroIdx !== -1) {
      const insertStart = roteiroIdx + roteiroHeader.length;
      const insertEnd = xml.indexOf('</w:tc>', insertStart);
      if (insertEnd !== -1) {
        const roteiroText = dados.roteiro || '';
        const roteiroLines = roteiroText.split('\n').filter((line: string) => line.trim() !== '');
        if (roteiroLines.length > 0) {
          const replacementXml = roteiroLines.map((line: string) => {
            return `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="141"/><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(line)}</w:t></w:r></w:p>`;
          }).join('');
          xml = xml.substring(0, insertStart) + replacementXml + xml.substring(insertEnd);
        }
      }
    }

    // Substitui "OBSERVAÇÕES:" parágrafos vazios
    const obsHeader = 'OBSERVAÇÕES:</w:t></w:r></w:p>';
    const obsIdx = xml.indexOf(obsHeader);
    if (obsIdx !== -1) {
      const insertStart = obsIdx + obsHeader.length;
      const insertEnd = xml.indexOf('</w:tc>', insertStart);
      if (insertEnd !== -1) {
        const obsText = dados.observacoes || '';
        const obsLines = obsText.split('\n').filter((line: string) => line.trim() !== '');
        if (obsLines.length > 0) {
          const replacementXml = obsLines.map((line: string) => {
            return `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="141"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(line)}</w:t></w:r></w:p>`;
          }).join('');
          xml = xml.substring(0, insertStart) + replacementXml + xml.substring(insertEnd);
        }
      }
    }

    zip.file('word/document.xml', xml);

    const newBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    return new NextResponse(new Uint8Array(newBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="ficha_${dados.aluno?.replace(/\s/g, '_') || 'atividade'}.docx"`,
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar ficha:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
