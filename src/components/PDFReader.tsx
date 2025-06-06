import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from './ui/button';
import { toast } from 'react-hot-toast';
import {
  FileUp,
  Download,
  Undo2,
  Redo2,
  FileText,
  Highlighter,
  Upload
} from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

interface Highlight {
  id: string;
  text: string;
  page: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: string;
}

const PDFReader: React.FC = () => {
  const [file, setFile] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [history, setHistory] = useState<Highlight[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('#FFEB3B');
  const [pageWidth, setPageWidth] = useState(800);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  const colors = [
    { name: 'Yellow', value: '#FFEB3B' },
    { name: 'Green', value: '#4CAF50' },
    { name: 'Blue', value: '#2196F3' },
    { name: 'Pink', value: '#E91E63' },
    { name: 'Orange', value: '#FF9800' },
  ];

  useEffect(() => {
    const updateWidth = () => {
      if (documentRef.current) {
        const containerWidth = documentRef.current.clientWidth;
        setPageWidth(Math.min(containerWidth - 40, 1000));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files && files[0]) {
      setFile(URL.createObjectURL(files[0]));
      setHighlights([]);
      setHistory([[]]);
      setHistoryIndex(0);
      toast.success('PDF loaded successfully!');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const addHighlight = useCallback((highlight: Highlight) => {
    const newHighlights = [...highlights, highlight];
    setHighlights(newHighlights);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newHighlights);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    toast.success('Text highlighted!');
  }, [highlights, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setHighlights(history[historyIndex - 1]);
      toast.success('Undone!');
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setHighlights(history[historyIndex + 1]);
      toast.success('Redone!');
    }
  }, [history, historyIndex]);

  const exportHighlights = useCallback(() => {
    if (highlights.length === 0) {
      toast.error('No highlights to export!');
      return;
    }

    const content = highlights
      .map((h, index) => `[${index + 1}] Page ${h.page}: "${h.text}"`)
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pdf-highlights.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Highlights exported!');
  }, [highlights]);

  const importHighlights = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      // Parse the imported file and find text in PDF
      // This is a simplified version - full implementation would search PDF content
      toast.success('Import feature coming soon!');
    };
    reader.readAsText(file);
  }, []);

  const handleTextSelection = useCallback((pageNumber: number) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
    
    if (pageElement) {
      const pageRect = pageElement.getBoundingClientRect();
      
      const highlight: Highlight = {
        id: Date.now().toString(),
        text: selectedText,
        page: pageNumber,
        position: {
          x: rect.left - pageRect.left,
          y: rect.top - pageRect.top,
          width: rect.width,
          height: rect.height,
        },
        color: selectedColor,
      };

      addHighlight(highlight);
      selection.removeAllRanges();
    }
  }, [selectedColor, addHighlight]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={onFileChange}
                accept=".pdf"
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <FileUp className="w-4 h-4" />
                Open PDF
              </Button>
              
              <input
                ref={importInputRef}
                type="file"
                onChange={importHighlights}
                accept=".txt"
                className="hidden"
              />
              <Button
                onClick={() => importInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!file}
              >
                <Upload className="w-4 h-4" />
                Import
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Color Picker */}
              <div className="flex items-center gap-1 mr-2">
                <Highlighter className="w-4 h-4 text-gray-600" />
                {colors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      selectedColor === color.value
                        ? 'border-gray-800 scale-125'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>

              <div className="h-6 w-px bg-gray-300" />

              <Button
                onClick={undo}
                variant="outline"
                size="sm"
                disabled={historyIndex === 0 || !file}
                className="gap-2"
              >
                <Undo2 className="w-4 h-4" />
                Undo
              </Button>
              
              <Button
                onClick={redo}
                variant="outline"
                size="sm"
                disabled={historyIndex === history.length - 1 || !file}
                className="gap-2"
              >
                <Redo2 className="w-4 h-4" />
                Redo
              </Button>

              <div className="h-6 w-px bg-gray-300" />

              <Button
                onClick={exportHighlights}
                variant="default"
                size="sm"
                disabled={highlights.length === 0}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                Export Highlights
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto" ref={documentRef}>
        <div className="max-w-7xl mx-auto p-4">
          {!file ? (
            <div className="flex flex-col items-center justify-center min-h-[600px] text-gray-500">
              <FileText className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg mb-4">No PDF loaded</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="default"
                className="gap-2"
              >
                <FileUp className="w-4 h-4" />
                Select a PDF file
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                className="pdf-document"
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <div key={`page_${index + 1}`} className="mb-4 relative">
                    <Page
                      pageNumber={index + 1}
                      width={pageWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-lg"
                      onMouseUp={() => handleTextSelection(index + 1)}
                      data-page-number={index + 1}
                    />
                    {/* Render highlights for this page */}
                    {highlights
                      .filter((h) => h.page === index + 1)
                      .map((highlight) => (
                        <div
                          key={highlight.id}
                          className="absolute pointer-events-none opacity-40"
                          style={{
                            left: highlight.position.x,
                            top: highlight.position.y,
                            width: highlight.position.width,
                            height: highlight.position.height,
                            backgroundColor: highlight.color,
                          }}
                        />
                      ))}
                  </div>
                ))}
              </Document>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFReader;