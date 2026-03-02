import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Bot, User, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface ClinicalContext {
  patientName: string;
  patientAge: number | null;
  currentRx: {
    odSphere: number | null;
    odCylinder: number | null;
    odAxis: number | null;
    odAdd: number | null;
    oiSphere: number | null;
    oiCylinder: number | null;
    oiAxis: number | null;
    oiAdd: number | null;
  };
  diagnosis: string;
  riskScore: number;
  riskLevel: string;
  alerts: string[];
  projections: string[];
  commercialLevel: string;
  occupation: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ClinicalAIChatProps {
  patientId: string;
  clinicalContext: ClinicalContext;
}

const QUICK_PROMPTS = [
  '¿Qué recomiendas para este paciente?',
  '¿Ves algo inusual?',
  '¿Hay riesgo de progresión?',
  '¿Qué tipo de lente sugieres?',
];

export function ClinicalAIChat({ patientId, clinicalContext }: ClinicalAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('clinical-ai-chat', {
        body: {
          message: content.trim(),
          patientId,
          clinicalContext,
          history: messages.slice(-8),
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'No pude procesar la solicitud.',
      }]);
    } catch (err: any) {
      console.error('Clinical AI Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error al consultar la IA. Intenta de nuevo.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 200); }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">IA Clínica Asistente</p>
            <p className="text-[11px] text-muted-foreground">Pregunta sobre este paciente...</p>
          </div>
          <Badge variant="outline" className="text-[9px]">IA</Badge>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">IA Clínica Asistente</span>
          <Badge variant="outline" className="text-[9px]">
            {clinicalContext.patientName.split(' ')[0]}
          </Badge>
        </div>
        <button type="button" onClick={() => setIsOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Minimizar
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="max-h-[280px] p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-4">
              <Bot className="h-8 w-8 mx-auto mb-2 text-primary/40" />
              <p className="text-xs text-muted-foreground">
                Pregúntame sobre el diagnóstico, riesgos o recomendaciones para este paciente.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn('flex items-start gap-2', msg.role === 'user' && 'flex-row-reverse')}>
              {msg.role === 'assistant' && (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              <div className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-xs',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted rounded-tl-sm'
              )}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-xs prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 text-primary" />
              </div>
              <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={isLoading}
              className="text-[10px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-1 border-t border-border">
        <div className="flex gap-1.5">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Pregunta sobre este paciente..."
            disabled={isLoading}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="h-8 w-8 p-0"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-start gap-1 mt-1.5">
          <Info className="h-2.5 w-2.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[9px] text-muted-foreground leading-tight">
            Asistente de apoyo. No sustituye criterio médico.
          </p>
        </div>
      </div>
    </div>
  );
}
