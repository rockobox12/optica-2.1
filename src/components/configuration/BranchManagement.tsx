import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Star, 
  Loader2,
  Building,
  Phone,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog';
import { useBranchManagement, Branch } from '@/hooks/useBranchManagement';
import { BranchFormModal } from './BranchFormModal';

export function BranchManagement() {
  const { 
    branches, 
    isLoading, 
    isSaving,
    createBranch, 
    updateBranch, 
    deleteBranch, 
    setMainBranch 
  } = useBranchManagement();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const handleAddNew = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Partial<Branch>) => {
    if (editingBranch) {
      await updateBranch(editingBranch.id, data);
    } else {
      await createBranch(data);
    }
    setIsModalOpen(false);
    setEditingBranch(null);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteBranch(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Gestión de Sucursales
            </CardTitle>
            <CardDescription>
              Administra las sucursales de tu negocio
            </CardDescription>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Sucursal
          </Button>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Building className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium">No hay sucursales registradas</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega tu primera sucursal para comenzar
              </p>
              <Button onClick={handleAddNew} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Sucursal
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Código</TableHead>
                    <TableHead className="font-semibold">Nombre</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Ciudad</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Teléfono</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {branches.map((branch, index) => (
                      <motion.tr
                        key={branch.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="group hover:bg-muted/30"
                      >
                        <TableCell className="font-mono text-sm">
                          {branch.code || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{branch.name}</span>
                            {branch.is_main && (
                              <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Principal
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {branch.city || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {branch.phone || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={branch.is_active ? 'default' : 'secondary'}
                            className={branch.is_active ? 'bg-success' : ''}
                          >
                            {branch.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!branch.is_main && branch.is_active && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-warning"
                                onClick={() => setMainBranch(branch.id)}
                                title="Establecer como principal"
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary"
                              onClick={() => handleEdit(branch)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteTarget(branch)}
                              disabled={branch.is_main}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BranchFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        branch={editingBranch}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Sucursal"
        itemName={deleteTarget?.name}
        description={`¿Estás seguro de eliminar la sucursal "${deleteTarget?.name}"? Esta acción no se puede deshacer. Las ventas y órdenes existentes de esta sucursal se mantendrán.`}
      />
    </>
  );
}
