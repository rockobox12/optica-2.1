import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function useAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: content,
          branchId: profile?.defaultBranchId,
          history: messages.slice(-10), // Last 10 messages for context
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Lo siento, no pude procesar tu solicitud.',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      
      let errorMessage = 'Hubo un error al procesar tu pregunta. Intenta de nuevo.';
      if (error.message?.includes('429')) {
        errorMessage = 'Demasiadas solicitudes. Por favor espera un momento.';
      } else if (error.message?.includes('402')) {
        errorMessage = 'Se requieren créditos adicionales para continuar.';
      }

      toast({
        title: 'Error del asistente',
        description: errorMessage,
        variant: 'destructive',
      });

      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, profile?.defaultBranchId, toast]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
