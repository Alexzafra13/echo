import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './SearchFilters.module.css';

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
  const { t } = useTranslation();
  return (
    <div className={styles.searchFilters}>
      <div className={styles.searchBox}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder={t('admin.users.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="roleFilter">{t('admin.users.roleLabel')}</label>
          <select
            id="roleFilter"
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value as 'all' | 'admin' | 'user')}
            className={styles.filterSelect}
          >
            <option value="all">{t('admin.users.filterAll')}</option>
            <option value="admin">{t('admin.users.filterAdmin')}</option>
            <option value="user">{t('admin.users.filterUser')}</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="statusFilter">{t('admin.users.statusLabel')}</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
            className={styles.filterSelect}
          >
            <option value="all">{t('admin.users.filterAll')}</option>
            <option value="active">{t('admin.users.filterActive')}</option>
            <option value="inactive">{t('admin.users.filterInactive')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
