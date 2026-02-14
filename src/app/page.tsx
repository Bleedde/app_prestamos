'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { LoanCard } from '@/components/loans/LoanCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchLoans } from '@/lib/hooks/useLoans';
import type { LoanStatus } from '@/types';

type FilterStatus = 'all' | LoanStatus;

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const { loans, isLoading } = useSearchLoans(searchTerm);

  // Filtrar por estado
  const filteredLoans = loans.filter((loan) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return loan.status === 'active';
    if (filterStatus === 'completed') return loan.status === 'completed';
    return true;
  });

  // Ordenar: vencidos primero, luego por días hasta vencimiento
  const sortedLoans = [...filteredLoans].sort((a, b) => {
    // Completados al final
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    // Vencidos primero
    if (a.is_overdue && !b.is_overdue) return -1;
    if (!a.is_overdue && b.is_overdue) return 1;
    // Luego por días hasta vencimiento (menores primero)
    return a.days_until_due - b.days_until_due;
  });

  return (
    <div className="min-h-screen">
      <Header />

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Barra de búsqueda */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtros */}
        <Tabs
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as FilterStatus)}
          className="mb-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="completed">Completados</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Lista de préstamos */}
        <div className="space-y-3">
          {isLoading ? (
            // Skeleton loading
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-lg bg-card"
                />
              ))}
            </div>
          ) : sortedLoans.length === 0 ? (
            // Estado vacío
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-medium">No hay préstamos</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchTerm
                  ? 'No se encontraron préstamos con ese nombre'
                  : 'Comienza agregando tu primer préstamo'}
              </p>
              {!searchTerm && (
                <Link href="/loans/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear préstamo
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            // Lista de tarjetas
            sortedLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
          )}
        </div>
      </div>

      {/* FAB para crear préstamo */}
      <Link
        href="/loans/new"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </Link>
    </div>
  );
}
