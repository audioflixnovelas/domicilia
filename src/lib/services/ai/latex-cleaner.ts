/**
 * Utilitário para conversão e limpeza de comandos e expressões LaTeX.
 * Converte notações matemáticas LaTeX para notação legível em português com símbolos Unicode.
 * Trata tanto comandos com barra invertida (\frac, \sin, etc.) quanto variações
 * sem barra (frac{}{}, sqrt{}, etc.) comumente geradas por modelos de linguagem.
 */

export function cleanLatexMath(text: string): string {
  if (!text) return text;
  let s = text;

  // 1. Remove marcadores de figura crus
  s = s.replace(/\[Figura:[^\]]*\]/gi, '');

  // 2. Remove delimitadores de blocos e inline LaTeX: $$, $, \[, \], \(, \)
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  s = s.replace(/\$([^\$\n]+)\$/g, '$1');
  s = s.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '$1');
  s = s.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, '$1');

  // 3. Remove delimitadores \left e \right
  s = s.replace(/\\left\s*([(\[{|.\\])/g, '$1');
  s = s.replace(/\\right\s*([)\]}|.\\])/g, '$1');

  // 4. Limpa macros de formatação de texto em LaTeX: \text{...}, \mathrm{...}, \textbf{...}, etc.
  // Executa em loop para resolver aninhamentos
  for (let i = 0; i < 5; i++) {
    const before = s;
    s = s.replace(/\\(?:text|mathrm|textbf|textit|mathbf|operatorname)\s*\{([^{}]+)\}/g, '$1');
    if (s === before) break;
  }

  // 5. Frações: \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b} E frac{a}{b} (com ou sem barra)
  // Executa em loop para resolver frações aninhadas
  for (let i = 0; i < 5; i++) {
    const before = s;
    s = s.replace(/\\?(?:d|t)?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, (_match, num, den) => {
      const cleanNum = num.trim();
      const cleanDen = den.trim();
      const needParenNum = /[+\-*/]/.test(cleanNum) && !cleanNum.startsWith('(');
      const needParenDen = /[+\-*/]/.test(cleanDen) && !cleanDen.startsWith('(');
      const formattedNum = needParenNum ? `(${cleanNum})` : cleanNum;
      const formattedDen = needParenDen ? `(${cleanDen})` : cleanDen;
      return `${formattedNum} / ${formattedDen}`;
    });
    if (s === before) break;
  }

  // 6. Raízes: \sqrt[n]{x}, \sqrt{x}, sqrt{x} (com ou sem barra)
  s = s.replace(/\\?sqrt\s*\[([^\]]+)\]\s*\{([^{}]+)\}/g, '$1√($2)');
  s = s.replace(/\\?sqrt\s*\{([^{}]+)\}/g, '√($1)');
  s = s.replace(/\\sqrt\b/g, '√');

  // 7. Graus: ^{\circ}, ^\circ, ^circ, \circ
  s = s.replace(/\^\{\s*\\?circ\s*\}/g, '°');
  s = s.replace(/\^\\?circ\b/g, '°');
  s = s.replace(/\\circ\b/g, '°');

  // 8. Funções trigonométricas e comandos matemáticos
  s = s.replace(/\\sen\b|\\sin\b/g, 'sen');
  s = s.replace(/\\cos\b/g, 'cos');
  s = s.replace(/\\tan\b|\\tg\b/g, 'tan');
  s = s.replace(/\\cot\b|\\cotan\b/g, 'cot');
  s = s.replace(/\\sec\b/g, 'sec');
  s = s.replace(/\\csc\b|\\cossec\b/g, 'cossec');
  s = s.replace(/\\arcsin\b|\\arcsen\b/g, 'arcsen');
  s = s.replace(/\\arccos\b/g, 'arccos');
  s = s.replace(/\\arctan\b|\\arctg\b/g, 'arctan');
  s = s.replace(/\\log\b/g, 'log');
  s = s.replace(/\\ln\b/g, 'ln');

  // 9. Letras gregas comuns
  s = s.replace(/\\theta\b/g, 'θ');
  s = s.replace(/\\alpha\b/g, 'α');
  s = s.replace(/\\beta\b/g, 'β');
  s = s.replace(/\\gamma\b/g, 'γ');
  s = s.replace(/\\delta\b/g, 'δ');
  s = s.replace(/\\Delta\b/g, 'Δ');
  s = s.replace(/\\pi\b/g, 'π');
  s = s.replace(/\\lambda\b/g, 'λ');
  s = s.replace(/\\mu\b/g, 'μ');
  s = s.replace(/\\sigma\b/g, 'σ');
  s = s.replace(/\\phi\b/g, 'φ');
  s = s.replace(/\\omega\b/g, 'ω');
  s = s.replace(/\\Omega\b/g, 'Ω');

  // 10. Operadores e símbolos matemáticos
  s = s.replace(/\\times\b/g, '×');
  s = s.replace(/\\cdot\b/g, '·');
  s = s.replace(/\\div\b/g, '÷');
  s = s.replace(/\\pm\b/g, '±');
  s = s.replace(/\\mp\b/g, '∓');
  s = s.replace(/\\neq\b|\\ne\b/g, '≠');
  s = s.replace(/\\leq\b|\\le\b/g, '≤');
  s = s.replace(/\\geq\b|\\ge\b/g, '≥');
  s = s.replace(/\\approx\b/g, '≈');
  s = s.replace(/\\equiv\b/g, '≡');
  s = s.replace(/\\infty\b/g, '∞');

  // 11. Espaçamento LaTeX: \quad, \qquad, \;, \;, \!
  s = s.replace(/\\(?:quad|qquad|enspace|,|;|!)/g, ' ');

  // 12. Expoentes comuns
  s = s.replace(/\^2\b|\^\{2\}/g, '²');
  s = s.replace(/\^3\b|\^\{3\}/g, '³');
  s = s.replace(/\^0\b|\^\{0\}/g, '⁰');
  s = s.replace(/\^1\b|\^\{1\}/g, '¹');
  s = s.replace(/\^4\b|\^\{4\}/g, '⁴');
  s = s.replace(/\^5\b|\^\{5\}/g, '⁵');
  s = s.replace(/\^6\b|\^\{6\}/g, '⁶');
  s = s.replace(/\^7\b|\^\{7\}/g, '⁷');
  s = s.replace(/\^8\b|\^\{8\}/g, '⁸');
  s = s.replace(/\^9\b|\^\{9\}/g, '⁹');
  s = s.replace(/\^\{([0-9a-zA-Z+-]+)\}/g, '^$1');

  // 13. Subscritos simples
  s = s.replace(/_\{([0-9a-zA-Z+-]+)\}/g, '_$1');

  // 14. Limpa barras invertidas residuais
  s = s.replace(/\\/g, '');

  return s;
}
