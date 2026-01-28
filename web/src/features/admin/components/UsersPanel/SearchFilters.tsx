import { Search } from 'lucide-react';
import styles from './UsersPanel.module.css';

interface SearchFiltersProps {
  searchQuery: string;
  roleFilter: 'all' | 'admin' | 'user';
  statusFilter: 'all' | 'active' | 'inactive';
  onSearchChange: (query: string) => void;
  onRoleFilterChange: (role: 'all' | 'admin' | 'user') => void;
  onStatusFilterChange: (status: 'all' | 'active' | 'inactive') => void;
}

export function SearchFilters({
  searchQuery,
  roleFilter,
  statusFilter,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
}: SearchFiltersProps) {
  return (
    <div className={styles.searchFilters}>
      <div className={styles.searchBox}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Buscar por nombre o usuario..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="roleFilter">Rol:</label>
          <select
            id="roleFilter"
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value as 'all' | 'admin' | 'user')}
            className={styles.filterSelect}
          >
            <option value="all">Todos</option>
            <option value="admin">Admin</option>
            <option value="user">Usuario</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="statusFilter">Estado:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
            className={styles.filterSelect}
          >
            <option value="all">Todos</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>
    </div>
  );
}
