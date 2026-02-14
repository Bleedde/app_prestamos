'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Trash2, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { clearDatabase, getDatabaseStats } from '@/lib/db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';

export default function SettingsPage() {
  const [clearing, setClearing] = useState(false);

  // Estadísticas de la base de datos
  const dbStats = useLiveQuery(async () => {
    const [loans, cycles, payments] = await Promise.all([
      db.loans.count(),
      db.cycles.count(),
      db.payments.count(),
    ]);
    return { loans, cycles, payments };
  }, []);

  const handleClearData = async () => {
    setClearing(true);
    try {
      await clearDatabase();
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setClearing(false);
    }
  };

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
          <h1 className="text-lg font-semibold">Configuración</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Info de la app */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Acerca de
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aplicación</span>
              <span>Mi Cartera de Préstamos</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versión</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Almacenamiento</span>
              <span>Local (IndexedDB)</span>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas de datos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Datos almacenados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Préstamos</span>
              <span>{dbStats?.loans ?? '...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ciclos</span>
              <span>{dbStats?.cycles ?? '...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagos</span>
              <span>{dbStats?.payments ?? '...'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Lógica de intereses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Cálculo de intereses
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm text-muted-foreground">
            <p>• Semanas 1-4 (días 1-28): <strong className="text-foreground">10%</strong> sobre el capital</p>
            <p>• Día 29 en adelante: <strong className="text-foreground">15%</strong> sobre el capital</p>
            <p>• El interés siempre se calcula sobre el capital original</p>
            <p>• No hay interés compuesto</p>
          </CardContent>
        </Card>

        {/* Zona peligrosa */}
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Zona peligrosa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              Eliminar todos los datos de la aplicación. Esta acción no se puede
              deshacer.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Borrar todos los datos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Borrar todos los datos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán todos los préstamos, pagos e historial. Esta
                    acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearData}
                    disabled={clearing}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {clearing ? 'Borrando...' : 'Sí, borrar todo'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
