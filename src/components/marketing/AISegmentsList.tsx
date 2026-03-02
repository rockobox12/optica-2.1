import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Target, Check, Sparkles } from 'lucide-react';

interface AISegment {
  name: string;
  segment_type: string;
  description: string;
  criteria: Record<string, any>;
  estimated_size: number;
  justification: string;
}

interface AISegmentsListProps {
  segments: AISegment[];
  onSelectSegment: (segment: AISegment) => void;
  selectedSegment?: AISegment | null;
}

const segmentTypeColors: Record<string, string> = {
  purchase: 'bg-blue-100 text-blue-800',
  clinical: 'bg-green-100 text-green-800',
  birthday: 'bg-pink-100 text-pink-800',
  credit: 'bg-amber-100 text-amber-800',
  frequency: 'bg-purple-100 text-purple-800',
  followup: 'bg-orange-100 text-orange-800',
};

export function AISegmentsList({ segments, onSelectSegment, selectedSegment }: AISegmentsListProps) {
  if (segments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Genera segmentos con IA para comenzar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Sparkles className="h-4 w-4" />
        <span>Segmentos generados por IA</span>
      </div>
      
      {segments.map((segment, index) => {
        const isSelected = selectedSegment?.name === segment.name;
        
        return (
          <Card 
            key={index}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSelectSegment(segment)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{segment.name}</h4>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {segment.description}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant="secondary"
                      className={segmentTypeColors[segment.segment_type] || 'bg-gray-100'}
                    >
                      {segment.segment_type}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>~{segment.estimated_size} pacientes</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {segment.justification && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground italic">
                    "{segment.justification}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
