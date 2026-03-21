import { useState, useEffect } from 'react';
import { Server, Edit3, Check, X, Palette } from 'lucide-react';
import { apiClient } from '@shared/services/api';
import { SERVER_COLORS, getServerColor } from './serverColors';
import styles from './FederationPanel.module.css';

interface ServerIdentityCardProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function ServerIdentityCard({ onSuccess, onError }: ServerIdentityCardProps) {
  const [serverName, setServerName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isLoadingName, setIsLoadingName] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);

  const [serverColor, setServerColor] = useState('purple');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSavingColor, setIsSavingColor] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [nameRes, colorRes] = await Promise.all([
          apiClient.get('/admin/settings/federation/server-name'),
          apiClient.get('/admin/settings/federation/server-color'),
        ]);
        setServerName((nameRes.data as { name: string }).name);
        setServerColor((colorRes.data as { color: string }).color || 'purple');
      } catch {
        // Sin conexión al servidor
      } finally {
        setIsLoadingName(false);
      }
    };
    load();
  }, []);

  const handleStartEdit = () => { setEditedName(serverName); setIsEditingName(true); };
  const handleCancelEdit = () => { setIsEditingName(false); setEditedName(''); };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    setIsSavingName(true);
    try {
      await apiClient.put('/admin/settings/server.name', { value: editedName.trim() });
      setServerName(editedName.trim());
      setIsEditingName(false);
      onSuccess('Nombre del servidor actualizado');
    } catch {
      onError('Error al guardar el nombre');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveColor = async (color: string) => {
    setIsSavingColor(true);
    try {
      await apiClient.put('/admin/settings/server.color', { value: color });
      setServerColor(color);
      setShowColorPicker(false);
      onSuccess('Color del servidor actualizado');
    } catch {
      onError('Error al guardar el color');
    } finally {
      setIsSavingColor(false);
    }
  };

  return (
    <>
      <div
        className={`${styles.serverIdentityCard} ${showColorPicker ? styles.serverIdentityCardExpanded : ''}`}
        style={{ '--server-color': getServerColor(serverColor).hex, '--server-color-rgb': getServerColor(serverColor).rgb } as React.CSSProperties}
      >
        <div className={styles.serverIdentityIcon}><Server size={24} /></div>
        <div className={styles.serverIdentityInfo}>
          <span className={styles.serverIdentityLabel}>Tu servidor se identifica como:</span>
          {isLoadingName ? (
            <span className={styles.serverIdentityName}>Cargando...</span>
          ) : isEditingName ? (
            <div className={styles.serverNameEdit}>
              <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className={styles.serverNameInput} placeholder="Nombre del servidor" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelEdit(); }} />
              <button className={styles.serverNameSaveBtn} onClick={handleSaveName} disabled={isSavingName || !editedName.trim()} title="Guardar"><Check size={16} /></button>
              <button className={styles.serverNameCancelBtn} onClick={handleCancelEdit} disabled={isSavingName} title="Cancelar"><X size={16} /></button>
            </div>
          ) : (
            <div className={styles.serverNameDisplay}>
              <span className={styles.serverIdentityName}>{serverName || 'Sin nombre configurado'}</span>
              <button className={styles.serverNameEditBtn} onClick={handleStartEdit} title="Editar nombre"><Edit3 size={14} /></button>
            </div>
          )}
        </div>
        <button className={styles.identityColorBtn} onClick={() => setShowColorPicker(!showColorPicker)} title="Cambiar color del servidor" disabled={isSavingColor}>
          <Palette size={18} />
        </button>
      </div>

      {showColorPicker && (
        <div className={styles.identityColorPicker}>
          <span className={styles.identityColorLabel}>Este color identifica tu servidor cuando otros se conectan:</span>
          <div className={styles.colorPicker}>
            {SERVER_COLORS.map((color) => (
              <button key={color.name} type="button" className={`${styles.colorSwatch} ${serverColor === color.name ? styles.colorSwatchActive : ''}`} style={{ '--swatch-color': color.hex, '--swatch-rgb': color.rgb } as React.CSSProperties} onClick={() => handleSaveColor(color.name)} disabled={isSavingColor} title={color.label} aria-label={color.label} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
