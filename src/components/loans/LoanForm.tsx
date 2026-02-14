'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { createLoan } from '@/lib/db/loans';
import { formatCOP, parseAmount } from '@/lib/utils/format';

export function LoanForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Estado del formulario
  const [clientName, setClientName] = useState('');
  const [principalStr, setPrincipalStr] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());

  // Calcular monto parseado
  const principal = parseAmount(principalStr);

  // Preview del préstamo
  const previewInterest = principal * 0.1; // 10% inicial
  const previewTotal = principal + previewInterest;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!clientName.trim()) {
      setError('El nombre del cliente es requerido');
      return;
    }

    if (principal <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    setIsLoading(true);

    try {
      const loan = await createLoan({
        client_name: clientName.trim(),
        principal,
        start_date: startDate.toISOString(),
      });

      // Redirigir al detalle del préstamo
      router.push(`/loans/${loan.id}`);
    } catch (err) {
      setError('Error al crear el préstamo. Intenta de nuevo.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nombre del cliente */}
      <div className="space-y-2">
        <Label htmlFor="clientName">Nombre del cliente</Label>
        <Input
          id="clientName"
          type="text"
          placeholder="Ej: Juan Pérez"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
      </div>

      {/* Fecha del préstamo */}
      <div className="space-y-2">
        <Label>Fecha del préstamo</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              type="button"
              disabled={isLoading}
              className={cn(
                'w-full justify-start text-left font-normal',
                !startDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(startDate, "d 'de' MMMM, yyyy", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => {
                if (date) {
                  setStartDate(date);
                  setCalendarOpen(false);
                }
              }}
              disabled={(date) => date > new Date()}
              defaultMonth={startDate}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Monto del préstamo */}
      <div className="space-y-2">
        <Label htmlFor="principal">Monto del préstamo (COP)</Label>
        <Input
          id="principal"
          type="text"
          inputMode="numeric"
          placeholder="Ej: 100000"
          value={principalStr}
          onChange={(e) => setPrincipalStr(e.target.value)}
          disabled={isLoading}
        />
        {principal > 0 && (
          <p className="text-sm text-muted-foreground">
            {formatCOP(principal)}
          </p>
        )}
      </div>

      {/* Preview */}
      {principal > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Resumen del préstamo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capital:</span>
              <span>{formatCOP(principal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interés (10%):</span>
              <span className="text-success">{formatCOP(previewInterest)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span>Total a cobrar:</span>
              <span>{formatCOP(previewTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              * Si el préstamo supera los 28 días, el interés sube a 15%
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Botón submit */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !clientName.trim() || principal <= 0}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creando...
          </>
        ) : (
          'Crear préstamo'
        )}
      </Button>
    </form>
  );
}
