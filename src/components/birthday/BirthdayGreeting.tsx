import { useState, useEffect } from 'react';
import { X, PartyPopper, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BirthdayUser {
  user_id: string;
  full_name: string;
  phone: string | null;
}

export function BirthdayGreeting() {
  const [showGreeting, setShowGreeting] = useState(false);
  const [birthdayUsers, setBirthdayUsers] = useState<BirthdayUser[]>([]);
  const [isMyBirthday, setIsMyBirthday] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile) {
      checkBirthdays();
    }
  }, [user, profile]);

  const checkBirthdays = async () => {
    // Check if it's the current user's birthday
    if (user) {
      const { data: myBirthday } = await supabase.rpc('is_birthday', {
        _user_id: user.id,
      });

      if (myBirthday) {
        setIsMyBirthday(true);
        setShowGreeting(true);
        return;
      }
    }

    // Check for other users with birthdays (for admins)
    const { data: birthdays } = await supabase.rpc('get_birthday_users');
    
    if (birthdays && birthdays.length > 0) {
      // Filter out current user
      const otherBirthdays = birthdays.filter(
        (b: BirthdayUser) => b.user_id !== user?.id
      );
      
      if (otherBirthdays.length > 0) {
        setBirthdayUsers(otherBirthdays);
        setShowGreeting(true);
      }
    }
  };

  const sendWhatsAppGreeting = (phone: string, name: string) => {
    const message = encodeURIComponent(
      `🎂 ¡Feliz Cumpleaños ${name}! 🎉\n\nTodo el equipo de Óptica Istmeña te desea un día maravilloso lleno de alegría y bendiciones. ¡Que todos tus deseos se hagan realidad!\n\n🎈 ¡Muchas felicidades! 🎈`
    );
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Open WhatsApp
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  if (!showGreeting) return null;

  return (
    <Dialog open={showGreeting} onOpenChange={setShowGreeting}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PartyPopper className="h-6 w-6 text-accent" />
            {isMyBirthday ? '¡Feliz Cumpleaños!' : '🎂 Cumpleaños Hoy'}
          </DialogTitle>
        </DialogHeader>

        {isMyBirthday ? (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🎂</div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              ¡Felicidades, {profile?.fullName?.split(' ')[0]}!
            </h2>
            <p className="text-muted-foreground mb-6">
              Todo el equipo de Óptica Istmeña te desea un día maravilloso lleno de alegría y éxitos.
            </p>
            <div className="flex gap-2 justify-center">
              <span className="text-3xl animate-bounce">🎈</span>
              <span className="text-3xl animate-bounce delay-75">🎉</span>
              <span className="text-3xl animate-bounce delay-150">🎁</span>
              <span className="text-3xl animate-bounce delay-200">🎊</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Los siguientes compañeros están de cumpleaños hoy:
            </p>
            
            <div className="space-y-3">
              {birthdayUsers.map((birthdayUser) => (
                <div
                  key={birthdayUser.user_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎂</span>
                    <div>
                      <p className="font-medium text-foreground">
                        {birthdayUser.full_name}
                      </p>
                      {birthdayUser.phone && (
                        <p className="text-xs text-muted-foreground">
                          {birthdayUser.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {birthdayUser.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendWhatsAppGreeting(birthdayUser.phone!, birthdayUser.full_name)}
                      className="gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Felicitar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={() => setShowGreeting(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
