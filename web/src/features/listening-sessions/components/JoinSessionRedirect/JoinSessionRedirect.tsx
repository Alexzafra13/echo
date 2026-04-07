import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { JoinSessionModal } from '../JoinSessionModal/JoinSessionModal';

/**
 * Componente que maneja la ruta /join/:code.
 * Muestra el modal de unirse con el codigo prellenado y
 * redirige a /social al cerrar.
 */
export default function JoinSessionRedirect() {
  const [, setLocation] = useLocation();
  const params = useParams<{ code: string }>();
  const [showModal, setShowModal] = useState(true);

  const handleClose = () => {
    setShowModal(false);
    setLocation('/social');
  };

  // Si no hay codigo, redirigir a social
  useEffect(() => {
    if (!params.code) {
      setLocation('/social');
    }
  }, [params.code, setLocation]);

  if (!params.code || !showModal) return null;

  return <JoinSessionModal onClose={handleClose} initialCode={params.code} />;
}
