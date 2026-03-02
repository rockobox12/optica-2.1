import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Phone, Eye, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySettings } from '@/hooks/useCompanySettings';

export default function Bienvenida() {
  const [searchParams] = useSearchParams();
  const { settings } = useCompanySettings();
  const [branchPhone, setBranchPhone] = useState('');
  const nombre = searchParams.get('nombre') || 'Estimado(a) cliente';
  const branchId = searchParams.get('sucursal');

  useEffect(() => {
    const fetchBranchPhone = async () => {
      if (branchId) {
        const { data } = await supabase
          .from('branches')
          .select('phone, whatsapp_number')
          .eq('id', branchId)
          .maybeSingle();
        if (data) {
          setBranchPhone(data.whatsapp_number || data.phone || '');
        }
      }
    };
    fetchBranchPhone();
  }, [branchId]);

  const telefono = branchPhone || settings?.phone || '';
  const companyName = settings?.company_name || 'Óptica Istmeña';
  const logoUrl = settings?.logo_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        <div className="bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
          {/* Header with logo */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-8 pt-10 pb-8 text-center">
            {logoUrl ? (
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                src={logoUrl}
                alt={companyName}
                className="h-20 w-20 object-contain mx-auto mb-4 rounded-2xl bg-white/20 p-2 backdrop-blur-sm"
              />
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="h-20 w-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <Eye className="h-10 w-10 text-primary-foreground" />
              </motion.div>
            )}
            <h1 className="text-2xl font-display font-bold text-primary-foreground">
              {companyName}
            </h1>
            {settings?.slogan && (
              <p className="text-primary-foreground/80 text-sm mt-1">{settings.slogan}</p>
            )}
          </div>

          {/* Welcome message body */}
          <div className="px-8 py-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-xl text-foreground">
                Hola <span className="font-bold text-primary">{nombre}</span> 👋
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-4 text-muted-foreground leading-relaxed"
            >
              <p>
                Bienvenido(a) a la familia <span className="font-semibold text-foreground">{companyName}</span>.
              </p>
              <p>
                Gracias por confiar en nosotros para tu salud visual.
              </p>
              <p>
                Para cualquier duda puedes comunicarte:
              </p>
            </motion.div>

            {/* Contact info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-secondary/50 rounded-2xl p-5 space-y-3"
            >
              {telefono && (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Óptica</p>
                    <a
                      href={`tel:${telefono}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {telefono}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Especialista en Salud Visual</p>
                  <p className="text-sm font-medium text-foreground">
                    Lic. Belem Castillejos Valle
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="text-center pt-2"
            >
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                Estamos para servirte
                <Heart className="h-4 w-4 text-destructive fill-destructive animate-pulse" />
                🤓
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
