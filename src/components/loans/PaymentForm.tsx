'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, RefreshCw, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { createPayment, validatePaymentAmount } from '@/lib/db/payments';
import { formatCOP, parseAmount } from '@/lib/utils/format';
import type { LoanWithCalculations, PaymentType } from '@/types';
import { cn } from '@/lib/utils';

interface PaymentFormProps {
  loan: LoanWithCalculations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const paymentOptions: {
  type: PaymentType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    type: 'complete',
    label: 'Pago completo',
    description: 'Capital + intereses, cierra el préstamo',
    icon: CheckCircle,
  },
  {
    type: 'interest_only',
    label: 'Solo intereses',
    description: 'Renueva el ciclo por 30 días más',
    icon: RefreshCw,
  },
  {
    type: 'partial',
    label: 'Abono a capital',
    description: 'Reduce el monto adeudado',
    icon: MinusCircle,
  },
];

export function PaymentForm({
  loan,
  open,
  onOpenChange,
  onSuccess,
}: PaymentFormProps) {
  const [selectedType, setSelectedType] = useState<PaymentType>('complete');
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular montos según tipo de pago
  const getAmount = (): number => {
    switch (selectedType) {
      case 'complete':
        return loan.total_owed;
      case 'interest_only':
        return loan.current_interest;
      case 'partial':
        return parseAmount(customAmount);
    }
  };

  const amount = getAmount();

  // Validar pago
  const validation = validatePaymentAmount(
    selectedType,
    amount,
    loan.principal,
    loan.current_interest
  );

  // Preview del resultado
  const getPreview = () => {
    switch (selectedType) {
      case 'complete':
        return {
          title: 'Resultado',
          description: 'El préstamo se marcará como completado',
        };
      case 'interest_only':
        return {
          title: 'Resultado',
          description: `Se iniciará un nuevo ciclo. Capital: ${formatCOP(loan.principal)}`,
        };
      case 'partial':
        const newPrincipal = loan.principal - amount;
        return {
          title: 'Resultado',
          description:
            newPrincipal > 0
              ? `Nuevo capital: ${formatCOP(newPrincipal)}`
              : 'El préstamo se completará',
        };
    }
  };

  const preview = getPreview();

  const handleSubmit = async () => {
    if (!validation.valid) {
      setError(validation.error || 'Error de validación');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createPayment({
        loan_id: loan.id,
        amount,
        payment_type: selectedType,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError('Error al registrar el pago. Intenta de nuevo.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedType('complete');
      setCustomAmount('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Total adeudado: {formatCOP(loan.total_owed)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Opciones de tipo de pago */}
          <div className="grid gap-2">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedType === option.type;

              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setSelectedType(option.type);
                    setError(null);
                  }}
                  disabled={isLoading}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Input de monto para pago parcial */}
          {selectedType === 'partial' && (
            <div className="space-y-2">
              <Label htmlFor="amount">Monto a abonar</Label>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                placeholder="Ej: 50000"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setError(null);
                }}
                disabled={isLoading}
              />
              {amount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {formatCOP(amount)}
                </p>
              )}
            </div>
          )}

          {/* Preview del monto y resultado */}
          {amount > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto a pagar:</span>
                  <span className="font-semibold">{formatCOP(amount)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {preview.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !validation.valid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Confirmar pago'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
