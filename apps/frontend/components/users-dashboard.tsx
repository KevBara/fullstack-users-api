'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';

import { API_BASE, User, UserQueryFilters, createUser, deleteAllUsers, deleteUser, fetchUsers, generateTestUsers, updateUser } from '@/lib/api';
import { UserForm, UserFormValues } from './user-form';

const emptyForm: UserFormValues = {
  name: '',
  email: '',
  role: 'user',
  active: true,
};

type UserFilterForm = {
  id: string;
  name: string;
  email: string;
  role: '' | User['role'];
  active: '' | 'true' | 'false';
  q: string;
};

const emptyFilterForm: UserFilterForm = {
  id: '',
  name: '',
  email: '',
  role: '',
  active: '',
  q: '',
};

export default function UsersDashboard() {
  const queryClient = useQueryClient();
  const userFormDetailsRef = useRef<HTMLDetailsElement>(null);
  const [page, setPage] = useState(1);
  const [pageDraft, setPageDraft] = useState('1');
  const [pageSize, setPageSize] = useState(10);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormValues>(emptyForm);
  const [filterForm, setFilterForm] = useState<UserFilterForm>(emptyFilterForm);
  const [filters, setFilters] = useState<UserQueryFilters>({});
  const [generationMessage, setGenerationMessage] = useState('');

  const usersQuery = useQuery({
    queryKey: ['users', page, pageSize, filters],
    queryFn: () => fetchUsers(page, pageSize, filters),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setForm(emptyForm);
      setEditingId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<User> }) => updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setForm(emptyForm);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: generateTestUsers,
    onSuccess: (result) => {
      setGenerationMessage(result.message);
      setPage(1);
      setPageDraft('1');
      setFilters({});
      setFilterForm(emptyFilterForm);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: deleteAllUsers,
    onSuccess: (result) => {
      setGenerationMessage(result.message);
      setPage(1);
      setPageDraft('1');
      setFilters({});
      setFilterForm(emptyFilterForm);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const initialValues = useMemo(
    () =>
      editingId
        ? usersQuery.data?.data.find((user) => user.id === editingId)
        : undefined,
    [editingId, usersQuery.data],
  );

  const handleSubmit = async (values: UserFormValues) => {
    const payload = {
      name: values.name,
      email: values.email,
      role: values.role,
      active: values.active,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const startEdit = (user: User) => {
    if (userFormDetailsRef.current) {
      userFormDetailsRef.current.open = true;
    }
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    });
  };

  const handleDelete = async (userId: string) => {
    const confirmed = window.confirm('¿Seguro que quieres eliminar este usuario?');

    if (!confirmed) {
      return;
    }

    await deleteMutation.mutateAsync(userId);
  };

  const exportUsers = () => {
    window.location.href = `${API_BASE}/users/export`;
  };

  const changePage = (nextPage: number) => {
    const lastPage = Math.max(usersQuery.data?.totalPages ?? 1, 1);
    const safePage = Math.min(Math.max(nextPage, 1), lastPage);
    setPage(safePage);
    setPageDraft(String(safePage));
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFilters: UserQueryFilters = {
      id: filterForm.id.trim() || undefined,
      name: filterForm.name.trim() || undefined,
      email: filterForm.email.trim() || undefined,
      role: filterForm.role || undefined,
      active: filterForm.active === '' ? undefined : filterForm.active === 'true',
      q: filterForm.q.trim() || undefined,
    };
    setPage(1);
    setPageDraft('1');
    setFilters(nextFilters);
  };

  const clearFilters = () => {
    setFilterForm(emptyFilterForm);
    setFilters({});
    setPage(1);
    setPageDraft('1');
  };

  return (
    <div className="dashboard">
      <details ref={userFormDetailsRef} className="panel collapsible-panel" open>
        <summary className="panel-header collapsible-heading">
          <span className="collapsible-copy">
            <span className="eyebrow">Gestión de usuarios</span>
            <span className="panel-title">{editingId ? 'Editar usuario' : 'Crear usuario'}</span>
          </span>
          <span className="disclosure-hint" aria-hidden="true" />
        </summary>

        <UserForm
          initialValues={initialValues}
          submitLabel={editingId ? 'Guardar cambios' : 'Crear usuario'}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditingId(null);
            setForm(emptyForm);
          }}
        />

        {createMutation.isError || updateMutation.isError || deleteMutation.isError ? (
          <div className="banner error-banner">
            {(createMutation.error ?? updateMutation.error ?? deleteMutation.error)?.message}
          </div>
        ) : null}
      </details>

      <section className="panel">
        <div className="panel-header table-header">
          <div>
            <p className="eyebrow">Registros</p>
            <h2>Lista de usuarios</h2>
          </div>

          <div className="table-toolbar">
            <label className="page-size-control">
              Usuarios por página
              <select value={pageSize} onChange={(event) => {
                setPageSize(Number(event.target.value));
                changePage(1);
              }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </label>
            <div className="header-actions">
              <button type="button" className="secondary-button" onClick={exportUsers}>Exportar CSV</button>
              {process.env.NODE_ENV !== 'production' ? (
                <>
                  <button
                    type="button"
                    className="primary-button generate-button"
                    disabled={generateMutation.isPending || clearAllMutation.isPending}
                    onClick={() => {
                      setGenerationMessage('');
                      generateMutation.mutate();
                    }}
                  >
                    {generateMutation.isPending ? <span className="spinner" aria-hidden="true" /> : null}
                    {generateMutation.isPending ? 'Generando 5.000…' : 'Generar 5.000 usuarios'}
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={generateMutation.isPending || clearAllMutation.isPending}
                    onClick={() => {
                      if (window.confirm('Se eliminarán todos los registros, incluidos los iniciales y los creados manualmente. ¿Continuar?')) {
                        setGenerationMessage('');
                        clearAllMutation.mutate();
                      }
                    }}
                  >
                    {clearAllMutation.isPending ? 'Limpiando…' : 'Borrar todos'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <details className="filters-disclosure">
          <summary>
            Filtros de búsqueda
            {Object.values(filters).filter((value) => value !== undefined && value !== '').length > 0
              ? ` (${Object.values(filters).filter((value) => value !== undefined && value !== '').length} activos)`
              : ''}
          </summary>
          <form className="filters-form" onSubmit={applyFilters}>
          <div className="filter-fields">
            <label className="field-group">
              ID exacto
              <input value={filterForm.id} onChange={(event) => setFilterForm((current) => ({ ...current, id: event.target.value }))} placeholder="user-1" />
            </label>
            <label className="field-group">
              Nombre
              <input value={filterForm.name} onChange={(event) => setFilterForm((current) => ({ ...current, name: event.target.value }))} placeholder="Alice" />
            </label>
            <label className="field-group">
              Correo electrónico
              <input value={filterForm.email} onChange={(event) => setFilterForm((current) => ({ ...current, email: event.target.value }))} placeholder="example.com" />
            </label>
            <label className="field-group">
              Búsqueda general
              <input value={filterForm.q} onChange={(event) => setFilterForm((current) => ({ ...current, q: event.target.value }))} placeholder="Nombre o correo" />
            </label>
            <label className="field-group">
              Rol
              <select value={filterForm.role} onChange={(event) => setFilterForm((current) => ({ ...current, role: event.target.value as UserFilterForm['role'] }))}>
                <option value="">Todos</option>
                <option value="admin">Administrador</option>
                <option value="user">Usuario</option>
                <option value="manager">Responsable</option>
              </select>
            </label>
            <label className="field-group">
              Estado
              <select value={filterForm.active} onChange={(event) => setFilterForm((current) => ({ ...current, active: event.target.value as UserFilterForm['active'] }))}>
                <option value="">Todos</option>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </label>
          </div>
          <div className="filter-actions">
            <button type="submit" className="primary-button">Aplicar filtros</button>
            <button type="button" className="secondary-button" onClick={clearFilters}>Limpiar</button>
          </div>
          </form>
        </details>

        {generateMutation.isError ? <div className="banner error-banner">{generateMutation.error.message}</div> : null}
        {clearAllMutation.isError ? <div className="banner error-banner">{clearAllMutation.error.message}</div> : null}
        {generationMessage ? <div className="banner success-banner" role="status">{generationMessage}</div> : null}

        {usersQuery.isLoading ? <div className="banner">Cargando usuarios...</div> : null}
        {usersQuery.isError ? <div className="banner error-banner">{usersQuery.error.message}</div> : null}

        {!usersQuery.isLoading && !usersQuery.isError && usersQuery.data?.data.length === 0 ? (
          <div className="empty-state">
            <h3>No hay registros</h3>
            <p>No hay registros. Registra usuarios con el formulario de al lado o genera datos de prueba para explorar la tabla.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (userFormDetailsRef.current) {
                  userFormDetailsRef.current.open = true;
                }
              }}
            >
              Registrar primer usuario
            </button>
          </div>
        ) : null}

        {!usersQuery.isLoading && !usersQuery.isError && usersQuery.data && usersQuery.data.data.length > 0 ? (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Correo electrónico</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data.data.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <span className="user-id" title={user.id}>
                          <span>{user.id.slice(0, Math.ceil(user.id.length / 2))}</span>
                          <span>{user.id.slice(Math.ceil(user.id.length / 2))}</span>
                        </span>
                      </td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{{ admin: 'Administrador', user: 'Usuario', manager: 'Responsable' }[user.role]}</td>
                      <td>{user.active ? 'Activo' : 'Inactivo'}</td>
                      <td>
                        <div className="action-buttons">
                          <button type="button" className="secondary-button" onClick={() => startEdit(user)}>
                            Editar
                          </button>
                          <button type="button" className="danger-button" onClick={() => handleDelete(user.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button type="button" aria-label="Primera página" title="Primera página" disabled={page <= 1} onClick={() => changePage(1)}>
                «
              </button>
              <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}>
                Anterior
              </button>
              <form className="page-jump" onSubmit={(event) => {
                event.preventDefault();
                changePage(Number(pageDraft) || 1);
              }}>
                <span>Página</span>
                <input
                  aria-label="Ir a la página"
                  type="number"
                  min={1}
                  max={Math.max(usersQuery.data.totalPages, 1)}
                  value={pageDraft}
                  onChange={(event) => setPageDraft(event.target.value)}
                />
                <span>de {Math.max(usersQuery.data.totalPages, 1)}</span>
                <button type="submit" className="secondary-button">Ir</button>
              </form>
              <button
                type="button"
                disabled={page >= usersQuery.data.totalPages}
                onClick={() => changePage(page + 1)}
              >
                Siguiente
              </button>
              <button
                type="button"
                aria-label="Última página"
                title="Última página"
                disabled={page >= usersQuery.data.totalPages}
                onClick={() => changePage(usersQuery.data.totalPages)}
              >
                »
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
