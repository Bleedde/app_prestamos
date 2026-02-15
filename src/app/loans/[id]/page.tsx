'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  History,
  Trash2,
  Pencil,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PaymentForm } from '@/components/loans/PaymentForm';
import { useLoan } from '@/lib/hooks/useLoans';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { deleteLoan, editLoanPrincipal } from '@/lib/db/loans';
import {
  formatCOP,
  formatDate,
  formatDateShort,
  formatDaysUntilDue,
  parseAmount,
} from '@/lib/utils/format';
import { formatInterestRate } from '@/lib/utils/interest';
import type { Payment } from '@/types';

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;

  const { loan, isLoading } = useLoan(loanId);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPrincipalStr, setEditPrincipalStr] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Obtener historial de pagos
  const payments = useLiveQuery(async () => {
    return db.payments
      .where('loan_id')
      .equals(loanId)
      .reverse()
      .sortBy('payment_date');
  }, [loanId]);

  // Obtener ciclos
  const cycles = useLiveQuery(async () => {
    return db.cycles.where('loan_id').equals(loanId).sortBy('cycle_number');
  }, [loanId]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteLoan(loanId);
      router.push('/');
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenEdit = () => {
    if (loan) {
      setEditPrincipalStr(String(loan.principal));
      setEditError(null);
      setEditOpen(true);
    }
  };

  const handleEditPrincipal = async () => {
    const newPrincipal = parseAmount(editPrincipalStr);
    if (newPrincipal <= 0) {
      setEditError('El monto debe ser mayor a 0');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      await editLoanPrincipal(loanId, newPrincipal);
      setEditOpen(false);
    } catch (err) {
      setEditError('Error al actualizar el capital');
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Préstamo no encontrado</p>
        <Link href="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = () => {
    if (loan.status === 'completed') {
      return <Badge variant="secondary">Completado</Badge>;
    }
    if (loan.is_overdue) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    return <Badge className="bg-success/10 text-success">Activo</Badge>;
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'complete':
        return 'Pago completo';
      case 'interest_only':
        return 'Intereses';
      case 'partial':
        return 'Abono';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Detalle</h1>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar préstamo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminarán todos los
                  datos del préstamo, incluyendo pagos e historial.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteLoading ? 'Eliminando...' : 'Eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Info del cliente */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarImage src={loan.photo_url} alt={loan.client_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(loan.client_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{loan.client_name}</h2>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">
              Ciclo {loan.current_cycle} • Día {loan.days_elapsed} de 30
            </p>
          </div>
        </div>

        {/* Total adeudado */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">
              Total adeudado HOY
            </p>
            <p className="text-3xl font-bold text-primary">
              {formatCOP(loan.total_owed)}
            </p>
            <div className="mt-2 flex gap-4 text-sm items-center">
              <span>
                Capital: <strong>{formatCOP(loan.principal)}</strong>
              </span>
              {loan.status === 'active' && (
                <button
                  onClick={handleOpenEdit}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <span>
                Intereses ({formatInterestRate(loan.current_interest_rate)}):{' '}
                <strong className="text-success">
                  {formatCOP(loan.current_interest)}
                </strong>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Fechas */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Inicio ciclo:</span>
              </div>
              <span className="text-sm font-medium">
                {formatDate(loan.cycle_start_date)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Vencimiento:</span>
              </div>
              <span
                className={`text-sm font-medium ${
                  loan.is_overdue ? 'text-destructive' : ''
                }`}
              >
                {formatDate(loan.due_date)} ({formatDaysUntilDue(loan.days_until_due)})
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Botón de pago */}
        {loan.status === 'active' && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => setPaymentOpen(true)}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Registrar pago
          </Button>
        )}

        {/* Timeline de ciclos */}
        {cycles && cycles.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Ciclos anteriores
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {cycles.slice(0, -1).map((cycle) => (
                  <div
                    key={cycle.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm"
                  >
                    <span>Ciclo {cycle.cycle_number}</span>
                    <span className="text-muted-foreground">
                      {formatDateShort(cycle.start_date)} -{' '}
                      {cycle.end_date
                        ? formatDateShort(cycle.end_date)
                        : 'Activo'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial de pagos */}
        {payments && payments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Historial de pagos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {formatCOP(payment.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPaymentTypeLabel(payment.payment_type)}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDateShort(payment.payment_date)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de pago */}
      <PaymentForm
        loan={loan}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />

      {/* Modal de editar capital */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar capital</DialogTitle>
            <DialogDescription>
              Cambia el monto del capital sin afectar fechas ni ciclos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editPrincipal">Nuevo capital (COP)</Label>
              <Input
                id="editPrincipal"
                type="text"
                inputMode="numeric"
                value={editPrincipalStr}
                onChange={(e) => setEditPrincipalStr(e.target.value)}
                placeholder="Ej: 200000"
              />
              {parseAmount(editPrincipalStr) > 0 && (
                <p className="text-sm text-muted-foreground">
                  {formatCOP(parseAmount(editPrincipalStr))}
                </p>
              )}
            </div>
            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditPrincipal}
              disabled={editLoading || parseAmount(editPrincipalStr) <= 0}
            >
              {editLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
