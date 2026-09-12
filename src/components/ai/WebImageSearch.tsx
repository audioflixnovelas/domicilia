'use client';

import { useState, useEffect } from 'react';
import { Search, Image as ImageIcon, Sparkles, Globe, Trash2, Plus, Check, Loader2, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';

interface WebImageResult {
  id: string;
  title: string;
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  source: 'Wikimedia Commons' | 'Wikipédia' | 'Openverse';
  description?: string;
}

interface WebImageSearchProps {
  disciplina: string;
  conteudo: string;
  serie?: string;
  selectedImages: string[];
  onImagesChange: (images: string[]) => void;
  autoSearchWeb: boolean;
  onAutoSearchWebChange: (enabled: boolean) => void;
}

export default function WebImageSearch({
  disciplina,
  conteudo,
  serie,
  selectedImages,
  onImagesChange,
  autoSearchWeb,
  onAutoSearchWebChange,
}: WebImageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WebImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [showWebSearch, setShowWebSearch] = useState(false);

  // Carrega sugestões inteligentes baseadas na disciplina e tema
  useEffect(() => {
    if (!disciplina && !conteudo) return;

    const params = new URLSearchParams({
      type: 'suggest',
      disciplina: disciplina || '',
      conteudo: conteudo || '',
      serie: serie || '',
    });

    fetch(`/api/ai/images?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.from(data.suggestions || []).length > 0) {
          setSuggestions(data.suggestions.slice(0, 4));
          if (!query && data.suggestions[0]) {
            setQuery(data.suggestions[0]);
          }
        }
      })
      .catch(() => {});
  }, [disciplina, conteudo, serie]);

  const handleSearch = async (searchTerm?: string) => {
    const term = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!term) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/ai/images?q=${encodeURIComponent(term)}&limit=10`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao buscar imagens na web.');
      }

      setResults(data.results || []);
      if ((data.results || []).length === 0) {
        setError('Nenhuma imagem encontrada para este termo. Tente palavras mais gerais.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar imagens na web.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWebImage = async (item: WebImageResult) => {
    setDownloadingId(item.id);
    setError('');

    try {
      const targetUrl = item.thumbUrl || item.fullUrl;
      const res = await fetch('/api/ai/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao baixar imagem da web.');
      }

      const dataUrl = data.image.dataUrl;
      if (!selectedImages.includes(dataUrl)) {
        onImagesChange([...selectedImages, dataUrl]);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar imagem da web.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          onImagesChange([...selectedImages, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    onImagesChange(selectedImages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/40 p-4">
      {/* Cabeçalho do Bloco de Imagens */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              Imagens & Recursos Visuais Educativos
            </h4>
            <p className="text-xs text-gray-500">
              Ilustrações, mapas históricos, esquemas e figuras para anexar no PDF e DOCX
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowWebSearch(!showWebSearch)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-xs font-medium text-purple-700 shadow-xs hover:bg-purple-50"
        >
          <Search className="h-3.5 w-3.5" />
          {showWebSearch ? 'Ocultar Pesquisa' : 'Pesquisar Imagens na Web'}
        </button>
      </div>

      {/* Opção de busca automática com a IA */}
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-white/80 p-2.5 border border-purple-100 transition-colors hover:bg-white">
        <input
          type="checkbox"
          checked={autoSearchWeb}
          onChange={(e) => onAutoSearchWebChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
        />
        <div className="text-xs">
          <span className="font-semibold text-purple-950 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            Buscar imagens educativas automaticamente na web com a IA
          </span>
          <p className="text-gray-500 mt-0.5">
            Ao gerar a atividade, o sistema pesquisa no Wikimedia Commons e Wikipédia as ilustrações ideais para o tema e as insere nos documentos com legendas pedagógicas.
          </p>
        </div>
      </label>

      {/* Painel Interativo de Busca de Imagens na Web */}
      {showWebSearch && (
        <div className="rounded-lg border border-purple-200 bg-white p-3 shadow-xs space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Pesquisar por tema, figura ou mapa (ex: Revolução Francesa, Célula, Relevo)..."
                className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-xs text-gray-900 focus:border-purple-500 focus:outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
            </div>

            <Button
              type="button"
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="px-3 py-1 text-xs"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Buscar'}
            </Button>
          </div>

          {/* Sugestões de Busca */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-gray-500 font-medium">Sugestões:</span>
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuery(sug);
                    handleSearch(sug);
                  }}
                  className="rounded-full bg-purple-50 px-2 py-0.5 text-purple-700 hover:bg-purple-100 transition-colors border border-purple-100"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>}

          {/* Grade de Resultados da Web */}
          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                Selecione as imagens desejadas para incluir na atividade:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
                {results.map((item) => {
                  const isDownloading = downloadingId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => !isDownloading && handleSelectWebImage(item)}
                      className="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-1.5 transition-all hover:border-purple-500 hover:shadow-sm"
                    >
                      <div className="relative aspect-4/3 w-full overflow-hidden rounded bg-gray-100">
                        <img
                          src={item.thumbUrl}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
                          {item.source}
                        </span>

                        {isDownloading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-[11px] font-medium text-gray-800" title={item.title}>
                        {item.title}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-purple-700">
                        <span>+ Adicionar</span>
                        <Plus className="h-3 w-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Manual de Arquivo do Computador */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-purple-700 hover:text-purple-800 font-medium">
          <Upload className="h-3.5 w-3.5" />
          <span>Ou faça upload de arquivos do seu computador</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {selectedImages.length > 0 && (
          <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            {selectedImages.length} imagem(ns) pronta(s) para o documento
          </span>
        )}
      </div>

      {/* Miniaturas das Imagens Atualmente Selecionadas */}
      {selectedImages.length > 0 && (
        <div className="rounded-lg border border-purple-100 bg-white p-2.5">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Imagens que serão anexadas ao PDF e DOCX da Atividade:
          </p>
          <div className="flex flex-wrap gap-2.5">
            {selectedImages.map((url, idx) => (
              <div
                key={idx}
                className="relative group rounded-lg border border-gray-200 bg-gray-50 p-1 shadow-2xs hover:border-purple-400"
              >
                <img
                  src={url}
                  alt={`Figura ${idx + 1}`}
                  className="h-20 w-24 object-cover rounded"
                />
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
                  Fig. {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700"
                  title="Remover imagem"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
