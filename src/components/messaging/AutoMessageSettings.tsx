import { useState } from 'react';
import { 
  MessageSquare, 
  Phone, 
  Settings2, 
  Edit3, 
  Eye, 
  Save,
  X,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  useAutoMessages, 
  MESSAGE_TYPE_CONFIG, 
  TEMPLATE_VARIABLES,
  replaceTemplateVariables,
  type AutoMessageTemplate,
  type AutoMessageType
} from '@/hooks/useAutoMessages';
import { cn } from '@/lib/utils';

function TemplateEditor({
  template,
  open,
  onOpenChange,
  onSave,
}: {
  template: AutoMessageTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, content: string) => void;
}) {
  const [content, setContent] = useState(template?.template_content || '');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const handleSave = () => {
    if (template) {
      onSave(template.id, content);
      onOpenChange(false);
    }
  };

  const previewVariables: Record<string, string> = {
    '{nombre}': 'Juan Pérez',
    '{fecha}': '15 de Febrero',
    '{hora}': '10:30 AM',
    '{numero_orden}': '00123',
    '{producto}': 'Armazón Ray-Ban + Lentes Progresivos',
    '{sucursal}': 'Sucursal Centro',
    '{doctor}': 'Dr. García',
    '{nueva_fecha}': '20 de Febrero',
    '{año}': new Date().getFullYear().toString(),
  };

  const previewContent = replaceTemplateVariables(content, previewVariables);

  if (!template) return null;

  const config = MESSAGE_TYPE_CONFIG[template.message_type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{config.icon}</span>
            Editar Plantilla: {template.name}
          </DialogTitle>
          <DialogDescription>
            Personaliza el mensaje. Usa las variables disponibles para contenido dinámico.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Contenido del mensaje</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
                placeholder="Escribe tu mensaje aquí..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                {content.length} caracteres
                {template.channel === 'sms' && content.length > 160 && (
                  <span className="text-warning ml-2">
                    (SMS largo: {Math.ceil(content.length / 160)} mensajes)
                  </span>
                )}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Variables disponibles</label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_VARIABLES.map((variable) => (
                  <TooltipProvider key={variable.key}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-mono"
                          onClick={() => handleCopyVariable(variable.key)}
                        >
                          {copiedVar === variable.key ? (
                            <Check className="h-3 w-3 mr-1 text-success" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          {variable.key}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{variable.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Vista previa
              </label>
              <div className={cn(
                'p-4 rounded-lg border',
                template.channel === 'whatsapp' 
                  ? 'bg-[#dcf8c6] border-[#25d366]/30' 
                  : 'bg-secondary'
              )}>
                <div className="flex items-start gap-2">
                  {template.channel === 'whatsapp' ? (
                    <MessageSquare className="h-5 w-5 text-[#25d366] flex-shrink-0 mt-0.5" />
                  ) : (
                    <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm whitespace-pre-wrap">{previewContent}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="text-sm font-medium">Información de ejemplo:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Cliente: Juan Pérez</li>
                <li>• Orden: #00123</li>
                <li>• Sucursal: Sucursal Centro</li>
                <li>• Doctor: Dr. García</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  template,
  onToggle,
  onEdit,
}: {
  template: AutoMessageTemplate;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (template: AutoMessageTemplate) => void;
}) {
  const config = MESSAGE_TYPE_CONFIG[template.message_type];

  return (
    <div className={cn(
      'p-4 rounded-lg border transition-all',
      template.is_active 
        ? 'bg-card border-border' 
        : 'bg-muted/30 border-border/50 opacity-75'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-2xl">{config.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">{template.name}</h4>
              <Badge variant={template.channel === 'whatsapp' ? 'default' : 'secondary'} className="text-[10px]">
                {template.channel === 'whatsapp' ? (
                  <><MessageSquare className="h-3 w-3 mr-1" /> WhatsApp</>
                ) : (
                  <><Phone className="h-3 w-3 mr-1" /> SMS</>
                )}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {template.template_content}
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => onEdit(template)}
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs',
            template.is_active ? 'text-success' : 'text-muted-foreground'
          )}>
            {template.is_active ? 'Activo' : 'Inactivo'}
          </span>
          <Switch
            checked={template.is_active}
            onCheckedChange={(checked) => onToggle(template.id, checked)}
          />
        </div>
      </div>
    </div>
  );
}

function TemplatesSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-lg border bg-card">
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AutoMessageSettings() {
  const { templates, loading, updateTemplate, toggleTemplateActive } = useAutoMessages();
  const [editingTemplate, setEditingTemplate] = useState<AutoMessageTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<AutoMessageType>('order_ready');

  const handleSaveTemplate = (id: string, content: string) => {
    updateTemplate(id, { template_content: content });
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.message_type]) {
      acc[template.message_type] = [];
    }
    acc[template.message_type].push(template);
    return acc;
  }, {} as Record<AutoMessageType, AutoMessageTemplate[]>);

  const messageTypes = Object.keys(MESSAGE_TYPE_CONFIG) as AutoMessageType[];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle>Mensajes Automáticos</CardTitle>
        </div>
        <CardDescription>
          Configura las plantillas de mensajes que se envían automáticamente a tus clientes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TemplatesSkeleton />
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AutoMessageType)}>
            <TabsList className="w-full flex-wrap h-auto gap-1 mb-6">
              {messageTypes.map((type) => {
                const config = MESSAGE_TYPE_CONFIG[type];
                const templatesForType = groupedTemplates[type] || [];
                const activeCount = templatesForType.filter(t => t.is_active).length;
                
                return (
                  <TabsTrigger 
                    key={type} 
                    value={type}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span>{config.icon}</span>
                    <span className="hidden sm:inline">{config.label}</span>
                    {activeCount > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {activeCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {messageTypes.map((type) => {
              const config = MESSAGE_TYPE_CONFIG[type];
              const templatesForType = groupedTemplates[type] || [];
              
              return (
                <TabsContent key={type} value={type} className="m-0">
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                        <span className="text-lg">{config.icon}</span>
                        {config.label}
                      </h4>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                    
                    <div className="space-y-3">
                      {templatesForType.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No hay plantillas configuradas para este tipo.
                        </p>
                      ) : (
                        templatesForType.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            onToggle={toggleTemplateActive}
                            onEdit={setEditingTemplate}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>

      <TemplateEditor
        template={editingTemplate}
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        onSave={handleSaveTemplate}
      />
    </Card>
  );
}
