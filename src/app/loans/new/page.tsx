'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoanForm } from '@/components/loans/LoanForm';

export default function NewLoanPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-4 px-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Nuevo préstamo</h1>
        </div>
      </header>

      {/* Contenido */}
      <div className="mx-auto max-w-lg px-4 py-6">
        <LoanForm />
      </div>
    </div>
  );
}
